import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import { AddressInfo } from 'net';
import { expect, test } from '@playwright/test';
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
    const excel = await request.get(`${baseUrl}/api/download/excel`);
    const summary = await request.get(`${baseUrl}/api/download/summary`);

    expect(excel.status()).toBe(404);
    expect(await excel.json()).toEqual({ error: 'Run an analysis first.' });
    expect(summary.status()).toBe(404);
    expect(await summary.json()).toEqual({ error: 'Run an analysis first.' });
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
    expect((await response.json()).error).toContain('No resume uploaded');
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
        role: 'qa',
        workMode: 'remote',
        userLocation: 'Campinas, SP',
        jobTitle: 'Analista de QA Jr',
        jobCompany: 'Venturus',
        jobUrl: 'https://jobs.example.com/venturus/qa-jr',
        jobDescription: JOB_DESCRIPTION,
      },
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.summary.source).toBe('manual');
    expect(body.summary.jobsCollected).toBe(1);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].title).toBe('Analista de QA Jr');
    expect(body.downloadUrl).toBe('/api/download/excel');
    expect(body.markdownUrl).toBe('/api/download/summary');

    const excel = await request.get(`${baseUrl}${body.downloadUrl}`);
    expect(excel.ok()).toBe(true);
    expect(excel.headers()['content-disposition']).toContain('job-match-report.xlsx');

    const markdown = await request.get(`${baseUrl}${body.markdownUrl}`);
    expect(markdown.ok()).toBe(true);
    expect(await markdown.text()).toContain('# Execution Summary');

    const uploadedFiles = fs.readdirSync(path.join(tempRoot, 'uploads'));
    expect(uploadedFiles).toEqual([]);
  });
});
