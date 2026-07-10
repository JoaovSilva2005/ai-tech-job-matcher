import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import { AddressInfo } from 'net';
import { expect, test } from '@playwright/test';
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
We are looking for a junior QA analyst to understand business rules, prepare and execute
manual tests, document defects, create automated tests with Playwright, validate web systems,
run API tests, use Git, collaborate with Scrum/Kanban teams and communicate in advanced English.
`;

test.describe('web UI real user flow', () => {
  let server: Server;
  let baseUrl: string;
  let tempRoot: string;
  let originalAiProvider: string | undefined;

  test.beforeEach(async () => {
    originalAiProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = 'fallback';
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
    resetEnvCache();
  });

  test('uploads a resume, analyzes a specific job and downloads reports', async ({ page }) => {
    await page.goto(baseUrl);

    await expect(page.getByRole('heading', { name: 'AI Tech Job Matcher' })).toBeVisible();
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
    await page.fill('#jobTitleInput', 'Analista de QA Jr');
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
    await expect(page.getByRole('heading', { name: 'Analista de QA Jr' })).toBeVisible();
    await expect(page.getByText('Venturus')).toBeVisible();
    await expect(page.getByText('Matched skills')).toBeVisible();
    await expect(page.locator('.chip.match', { hasText: 'Playwright' })).toBeVisible();
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

    expect(fs.readdirSync(path.join(tempRoot, 'uploads'))).toEqual([]);
  });
});
