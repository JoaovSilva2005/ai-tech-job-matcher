import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import { AddressInfo } from 'net';
import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';
import { createApp } from '../../src/web/server';
import { resetEnvCache } from '../../src/config/env';

const RESUME_TEXT = `
Alex Santos
Junior QA Analyst
Skills: Playwright, TypeScript, JavaScript, Git, Manual Testing, API Testing, SQL.
English: advanced.
Experience writing test cases, bug reports and automated tests for web systems.
`;

const JOB_DESCRIPTION = `
We are hiring a junior QA analyst to prepare and execute manual tests, write bug reports,
create automated tests with Playwright, validate web systems, work with Git, Scrum and
Kanban, and communicate in advanced English with global stakeholders.
`;

test.describe('web API upload/download flow', () => {
  let server: Server;
  let baseUrl: string;
  let tempRoot: string;
  let originalAiProvider: string | undefined;

  test.beforeEach(async () => {
    originalAiProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = 'fallback';
    resetEnvCache();

    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tech-job-matcher-api-'));
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

  test('health endpoint exposes supported selectors', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/health`);
    const body = await response.json();

    expect(response.ok()).toBe(true);
    expect(body.status).toBe('ok');
    expect(body.roles).toContain('qa');
    expect(body.sources).toContain('gupy');
    expect(body.workModes).toEqual(expect.arrayContaining(['all', 'remote', 'hybrid', 'onsite']));
  });

  test('download endpoints return JSON 404 before any analysis', async ({ request }) => {
    const missingRun = '00000000-0000-4000-8000-000000000000';
    const excel = await request.get(`${baseUrl}/api/runs/${missingRun}/download/excel`);
    const summary = await request.get(`${baseUrl}/api/runs/${missingRun}/download/summary`);

    expect(excel.status()).toBe(404);
    expect(await excel.json()).toEqual({ error: 'Report not found or expired.' });
    expect(summary.status()).toBe(404);
    expect(await summary.json()).toEqual({ error: 'Report not found or expired.' });
  });

  test('analyze endpoint rejects missing resume upload', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/analyze`, {
      multipart: {
        role: 'qa',
      },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('No resume uploaded');
  });

  test('analyze endpoint rejects unsupported resume extensions as JSON', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/analyze`, {
      multipart: {
        resume: {
          name: 'resume.exe',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('not a supported resume'),
        },
      },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('Unsupported resume format');
  });

  test('analyze endpoint rejects files over the upload limit as JSON', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/analyze`, {
      multipart: {
        resume: {
          name: 'large-resume.txt',
          mimeType: 'text/plain',
          buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 'a'),
        },
      },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('too large');
  });

  test('specific job analysis returns matches and downloadable reports', async ({ request }) => {
    const response = await request.post(`${baseUrl}/api/analyze`, {
      multipart: {
        resume: {
          name: 'resume.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(RESUME_TEXT),
        },
        analysisMode: 'specific',
        role: 'qa',
        userLocation: 'Campinas, SP',
        jobTitle: 'Analista de QA Jr',
        jobCompany: 'Venturus',
        jobUrl: 'https://venturus.gupy.io/jobs/123456',
        jobLocation: 'Remote - Brazil',
        jobWorkMode: 'remote',
        jobDescription: JOB_DESCRIPTION,
      },
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.summary.source).toBe('manual');
    expect(body.summary.jobsCollected).toBe(1);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].title).toBe('Analista de QA Jr');
    expect(body.matches[0].location).toBe('Remote - Brazil');
    expect(body.matches[0].location).not.toContain('Campinas');
    expect(body.runId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.downloadUrl).toBe(`/api/runs/${body.runId}/download/excel`);
    expect(body.markdownUrl).toBe(`/api/runs/${body.runId}/download/summary`);

    const excel = await request.get(`${baseUrl}${body.downloadUrl}`);
    expect(excel.ok()).toBe(true);
    expect(excel.headers()['content-disposition']).toContain('job-match-report.xlsx');

    const markdown = await request.get(`${baseUrl}${body.markdownUrl}`);
    expect(markdown.ok()).toBe(true);
    expect(await markdown.text()).toContain('# Execution Summary');

    const uploadedFiles = fs.readdirSync(path.join(tempRoot, 'uploads'));
    expect(uploadedFiles).toEqual([]);
  });

  test('specific job analysis rejects placeholder or missing application URLs', async ({
    request,
  }) => {
    const response = await request.post(`${baseUrl}/api/analyze`, {
      multipart: {
        resume: {
          name: 'resume.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(RESUME_TEXT),
        },
        analysisMode: 'specific',
        role: 'qa',
        jobTitle: 'QA Jr',
        jobCompany: 'Example Co',
        jobUrl: 'https://example.com/jobs/qa-jr',
        jobDescription: JOB_DESCRIPTION,
      },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('real HTTP(S) application URL');
    expect(fs.readdirSync(path.join(tempRoot, 'uploads'))).toEqual([]);
  });

  test('search analysis rejects invalid selectors instead of silently changing them', async ({
    request,
  }) => {
    const response = await request.post(`${baseUrl}/api/analyze`, {
      multipart: {
        resume: {
          name: 'resume.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(RESUME_TEXT),
        },
        analysisMode: 'search',
        role: 'qa',
        source: 'unknown-source',
        workMode: 'remote',
        limit: '16',
      },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).error).toContain('Invalid job source');
  });

  test('concurrent analyses keep their reports isolated by run ID', async ({ request }) => {
    const analyze = (title: string, company: string, jobId: string) =>
      request.post(`${baseUrl}/api/analyze`, {
        multipart: {
          resume: {
            name: 'resume.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(RESUME_TEXT),
          },
          analysisMode: 'specific',
          role: 'qa',
          userLocation: 'Campinas, SP',
          jobTitle: title,
          jobCompany: company,
          jobUrl: `https://venturus.gupy.io/jobs/${jobId}`,
          jobLocation: 'Remote - Brazil',
          jobWorkMode: 'remote',
          jobDescription: JOB_DESCRIPTION,
        },
      });

    const [firstResponse, secondResponse] = await Promise.all([
      analyze('QA Alpha', 'Alpha Tech', '111111'),
      analyze('QA Beta', 'Beta Tech', '222222'),
    ]);
    expect(firstResponse.ok()).toBe(true);
    expect(secondResponse.ok()).toBe(true);

    const first = await firstResponse.json();
    const second = await secondResponse.json();
    expect(first.runId).not.toBe(second.runId);
    expect(first.downloadUrl).not.toBe(second.downloadUrl);

    const [firstExcel, secondExcel] = await Promise.all([
      request.get(`${baseUrl}${first.downloadUrl}`),
      request.get(`${baseUrl}${second.downloadUrl}`),
    ]);
    const firstWorkbook = new ExcelJS.Workbook();
    const secondWorkbook = new ExcelJS.Workbook();
    await firstWorkbook.xlsx.load(await firstExcel.body());
    await secondWorkbook.xlsx.load(await secondExcel.body());

    expect(firstWorkbook.getWorksheet('Ranking')?.getCell('F2').value).toBe('Alpha Tech');
    expect(secondWorkbook.getWorksheet('Ranking')?.getCell('F2').value).toBe('Beta Tech');
  });
});
