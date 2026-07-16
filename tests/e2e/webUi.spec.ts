import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import { AddressInfo } from 'net';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createApp } from '../../src/web/server';
import { resetEnvCache } from '../../src/config/env';

const RESUME_TEXT = `
Joao Silva
Junior QA Analyst
Skills: Playwright, TypeScript, JavaScript, Git, Manual Testing, API Testing, SQL.
English: advanced.
Experience creating test cases, reporting bugs and automating web regression tests.
`;

const JOB_DESCRIPTION = `
We are looking for a Senior QA Lead to own quality strategy, prepare and execute risk-based tests,
document defects, design Playwright automation, validate web systems, mentor engineers, run API
tests, use Git, collaborate with Scrum/Kanban teams and communicate in advanced English.
`;

test.describe('web UI real user flow', () => {
  let server: Server;
  let baseUrl: string;
  let tempRoot: string;
  let originalAiProvider: string | undefined;
  let originalLeverCompanySlugs: string | undefined;

  test.beforeEach(async () => {
    originalAiProvider = process.env.AI_PROVIDER;
    originalLeverCompanySlugs = process.env.LEVER_COMPANY_SLUGS;
    process.env.AI_PROVIDER = 'fallback';
    process.env.LEVER_COMPANY_SLUGS = '';
    resetEnvCache();

    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tech-job-matcher-ui-'));
    const app = createApp({
      uploadDir: path.join(tempRoot, 'uploads'),
      outputDir: path.join(tempRoot, 'output'),
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  test.afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
    fs.rmSync(tempRoot, { recursive: true, force: true });
    process.env.AI_PROVIDER = originalAiProvider;
    process.env.LEVER_COMPANY_SLUGS = originalLeverCompanySlugs;
    resetEnvCache();
  });

  test('uploads a resume, analyzes a specific job and downloads reports', async ({ page }) => {
    await page.goto(baseUrl);

    await expect(page.getByRole('heading', { name: 'AI Tech Job Matcher' })).toBeVisible();
    await expect(page.locator('#sourceSelect option[value="lever"]')).toBeDisabled();
    await expect(page.locator('#sourceSelect option[value="jooble"]')).toBeDisabled();
    await expect(page.locator('#sourceSelect option[value="recruitee"]')).toBeDisabled();
    await expect(page.locator('#sourceSelect option[value="jsonld"]')).toBeDisabled();
    await page.setInputFiles('#resumeInput', {
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(RESUME_TEXT),
    });
    await expect(page.locator('#fileName')).toHaveText('resume.txt');

    await page.selectOption('#roleSelect', 'qa');
    await page.fill('#locationInput', 'Campinas, SP');
    await page.getByText('Analyze one job', { exact: true }).click();
    await expect(page.locator('input[name="analysisMode"][value="specific"]')).toBeChecked();
    await expect(page.locator('#specificJobFields')).toBeVisible();
    await expect(page.locator('#sourceSelect')).toBeDisabled();
    await page.fill('#jobTitleInput', 'Senior QA Lead');
    await page.fill('#jobCompanyInput', 'Venturus');
    await page.fill('#jobUrlInput', 'https://venturus.gupy.io/jobs/123456');
    await page.fill('#jobLocationInput', 'Remote - Brazil');
    await page.selectOption('#jobWorkModeSelect', 'remote');
    await page.fill('#jobDescriptionInput', JOB_DESCRIPTION);

    await page.getByRole('button', { name: 'Analyze this job' }).click();

    await expect(page.getByRole('heading', { name: 'Ranked matches' })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('.card')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Senior QA Lead' })).toBeVisible();
    await expect(page.getByText('Venturus')).toBeVisible();
    await expect(page.getByText('Matched skills')).toBeVisible();
    await expect(page.locator('.chip.match', { hasText: 'Playwright' })).toBeVisible();
    await expect(page.locator('.quality-pill')).toContainText('QA:');
    await expect(page.getByText('Data quality', { exact: true })).toBeVisible();
    await expect(page.getByText('Candidate compatibility notes (1)')).toBeVisible();
    await expect(page.getByText('Data quality notes (1)')).toBeVisible();
    await expect(page.locator('.apply-link')).toHaveAttribute(
      'href',
      'https://venturus.gupy.io/jobs/123456'
    );

    const excelDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download Excel report' }).click();
    expect((await excelDownload).suggestedFilename()).toBe('job-match-report.xlsx');

    const markdownDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download Markdown summary' }).click();
    expect((await markdownDownload).suggestedFilename()).toBe('execution-summary.md');

    const accessibility = await new AxeBuilder({ page }).include('#resultsState').analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? '')
      )
    ).toEqual([]);

    expect(fs.readdirSync(path.join(tempRoot, 'uploads'))).toEqual([]);
  });

  test('keeps empty analyses auditable and explains where jobs were removed', async ({ page }) => {
    let responseBody: unknown;
    await page.route('**/api/analyze', async (route) => {
      await route.fulfill({ json: responseBody });
    });
    await page.goto(baseUrl);
    await page.setInputFiles('#resumeInput', {
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(RESUME_TEXT),
    });

    const baseSummary = {
      aiProvider: 'gemini',
      usedFallback: false,
      jobsCollected: 4,
      jobsValid: 3,
      jobsNeedingReview: 0,
      jobsInvalid: 1,
      duplicatesRemoved: 0,
      jobsAfterRoleFilter: 3,
      jobsAfterWorkModeFilter: 3,
    };
    const runEmptyAnalysis = async (summary: object, expectedMessage: RegExp) => {
      responseBody = {
        summary,
        resumeAnalysis: { detectedSeniority: 'junior' },
        matches: [],
        downloadUrl: '/api/runs/empty-run/download/excel',
        markdownUrl: '/api/runs/empty-run/download/summary',
      };

      await page.getByRole('button', { name: 'Analyze jobs' }).click();
      await expect(page.locator('#emptyState')).toBeVisible();
      await expect(page.locator('#emptyMsg')).toHaveText(expectedMessage);
      await expect(page.locator('#analysisSummary')).toBeVisible();
      await expect(page.locator('#resultsState')).toBeHidden();
    };

    await runEmptyAnalysis(
      {
        ...baseSummary,
        jobsCollected: 0,
        jobsValid: 0,
        jobsInvalid: 0,
        jobsAfterRoleFilter: 0,
        jobsAfterWorkModeFilter: 0,
      },
      /No jobs were collected from this source/
    );

    const summary = page.locator('#analysisSummary');
    await expect(summary.getByText('AI · gemini', { exact: true })).toBeVisible();
    await expect(summary.getByText('Analysis engine', { exact: true })).toBeVisible();
    await expect(summary.getByText('Jobs collected', { exact: true })).toBeVisible();
    await expect(summary.getByRole('link', { name: 'Download Excel report' })).toHaveAttribute(
      'href',
      '/api/runs/empty-run/download/excel'
    );
    await expect(summary.getByRole('link', { name: 'Download Markdown summary' })).toHaveAttribute(
      'href',
      '/api/runs/empty-run/download/summary'
    );

    await runEmptyAnalysis(
      {
        ...baseSummary,
        jobsValid: 1,
        jobsInvalid: 3,
        duplicatesRemoved: 1,
        jobsAfterRoleFilter: 0,
        jobsAfterWorkModeFilter: 0,
      },
      /none remained after data validation and duplicate removal/
    );
    await runEmptyAnalysis(
      {
        ...baseSummary,
        duplicatesRemoved: 1,
        jobsAfterRoleFilter: 0,
        jobsAfterWorkModeFilter: 0,
      },
      /none matched the selected role/
    );
    await runEmptyAnalysis(
      {
        ...baseSummary,
        duplicatesRemoved: 1,
        jobsAfterRoleFilter: 2,
        jobsAfterWorkModeFilter: 0,
      },
      /none matched the selected work mode/
    );
    await runEmptyAnalysis(
      { aiProvider: 'gemini', usedFallback: false },
      /no ranked matches were produced/
    );

    const accessibility = await new AxeBuilder({ page }).include('#liveRegion').analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? '')
      )
    ).toEqual([]);
  });

  test('keeps the complete form inside a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(baseUrl);

    await page.getByText('Analyze one job', { exact: true }).click();
    await expect(page.locator('#specificJobFields')).toBeVisible();

    const viewport = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);

    for (const selector of ['#resumeInput', '#locationInput', '#jobUrlInput', '#analyzeBtn']) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? '')
      )
    ).toEqual([]);
  });
});
