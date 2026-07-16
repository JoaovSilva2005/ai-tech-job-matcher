import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { runPipeline } from '../../src/index';
import type { CliOptions } from '../../src/cli/cliTypes';
import { validateJob } from '../../src/scraper/validateJob';
import type { ScrapedJob } from '../../src/scraper/types';
import { resetEnvCache } from '../../src/config/env';

const RESUME_PATH = path.resolve(__dirname, '../../samples/sample-resume.txt');
const OUTPUT_ROOT = path.resolve(__dirname, '../../output/e2e');
const originalFetch = globalThis.fetch;

function makeOptions(overrides: Partial<CliOptions>): CliOptions {
  return {
    resume: RESUME_PATH,
    role: 'all',
    source: 'sample',
    workMode: 'all',
    userLocation: '',
    limit: 20,
    output: path.join(OUTPUT_ROOT, overrides.role ?? 'all'),
    fallback: true, // pipeline must work without any API key
    debug: false,
    ...overrides,
  };
}

test.describe('full pipeline (sample source, no API key)', () => {
  test('role=qa produces only QA jobs and all output files', async () => {
    const result = await runPipeline(makeOptions({ role: 'qa' }));

    expect(result.matches.length).toBeGreaterThanOrEqual(4);
    for (const match of result.matches) {
      expect(match.analysis.role).toBe('qa');
      expect(match.score).toBeGreaterThanOrEqual(0);
      expect(match.score).toBeLessThanOrEqual(100);
    }

    for (const file of Object.values(result.outputFiles)) {
      expect(fs.existsSync(file), `expected output file ${file}`).toBe(true);
    }
    expect(result.outputFiles.excel).toMatch(/job-match-report\.xlsx$/);
    expect(result.outputFiles.markdown).toMatch(/execution-summary\.md$/);
  });

  test('role=frontend filters to frontend jobs', async () => {
    const result = await runPipeline(makeOptions({ role: 'frontend' }));
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    for (const match of result.matches) {
      expect(match.analysis.role).toBe('frontend');
    }
  });

  test('role=all returns mixed roles ranked by descending score', async () => {
    const result = await runPipeline(makeOptions({ role: 'all' }));
    expect(result.matches.length).toBeGreaterThanOrEqual(10);

    const roles = new Set(result.matches.map((m) => m.analysis.role));
    expect(roles.size).toBeGreaterThanOrEqual(4);
    expect(roles).not.toContain('unknown');

    const scores = result.matches.map((m) => m.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);

    expect(
      result.matches.some((match) =>
        match.candidateWarnings.some((warning) => warning.field === 'seniority')
      )
    ).toBe(true);
    for (const match of result.matches) {
      expect(match.validation).toEqual(validateJob(match.job));
      expect(match.validation.issues.some((issue) => issue.field === 'seniority')).toBe(false);
    }
  });

  test('duplicates are removed and reported in the execution summary', async () => {
    const result = await runPipeline(
      makeOptions({ role: 'all', output: path.join(OUTPUT_ROOT, 'dedupe') })
    );
    // sample-jobs.html contains an intentional duplicate posting (tb-017)
    expect(result.summary.duplicatesRemoved).toBeGreaterThanOrEqual(1);
    const titles = result.matches.map((m) => `${m.job.title}::${m.job.company}`.toLowerCase());
    expect(new Set(titles).size).toBe(titles.length);
  });

  test('work mode filter returns only remote jobs', async () => {
    const result = await runPipeline(
      makeOptions({
        role: 'all',
        workMode: 'remote',
        output: path.join(OUTPUT_ROOT, 'remote-filter'),
      })
    );

    expect(result.matches.length).toBeGreaterThanOrEqual(5);
    expect(result.summary.workMode).toBe('remote');
    expect(result.summary.jobsAfterWorkModeFilter).toBe(result.matches.length);
    expect(result.matches.every((match) => match.job.workMode === 'remote')).toBe(true);
  });

  test('location preference boosts nearby hybrid jobs', async () => {
    const result = await runPipeline(
      makeOptions({
        role: 'all',
        workMode: 'hybrid',
        userLocation: 'Campinas, SP',
        output: path.join(OUTPUT_ROOT, 'campinas-filter'),
      })
    );

    expect(result.matches.length).toBeGreaterThanOrEqual(1);
    expect(result.summary.userLocation).toBe('Campinas, SP');
    expect(result.matches.every((match) => match.job.workMode === 'hybrid')).toBe(true);
    expect(result.matches[0].job.location?.toLowerCase()).toContain('campinas');
    expect(result.matches[0].locationPreference).toContain('same city');
  });

  test('specific job input analyzes only the provided opportunity', async () => {
    const result = await runPipeline(
      makeOptions({
        role: 'qa',
        output: path.join(OUTPUT_ROOT, 'specific-job'),
        manualJob: {
          title: 'Analista de QA Jr',
          company: 'Venturus',
          url: 'https://jobs.example.com/venturus/qa-jr',
          location: 'Remote - Brazil',
          workMode: 'remote',
          description:
            'We are hiring a junior QA analyst to prepare and execute manual tests, write bug reports, create automated tests with Playwright, validate web systems, work with Git, Scrum and Kanban, and communicate in advanced English with global stakeholders.',
        },
      })
    );

    expect(result.summary.source).toBe('manual');
    expect(result.summary.jobsCollected).toBe(1);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].job.title).toBe('Analista de QA Jr');
    expect(result.matches[0].job.company).toBe('Venturus');
    expect(result.matches[0].analysis.role).toBe('qa');
  });

  test('pipeline reports fallback mode when no AI key is configured', async () => {
    const result = await runPipeline(
      makeOptions({ role: 'qa', output: path.join(OUTPUT_ROOT, 'fallback') })
    );
    expect(result.summary.usedFallback).toBe(true);
    expect(result.summary.aiProvider).toBe('local-fallback');

    const markdown = fs.readFileSync(result.outputFiles.markdown, 'utf-8');
    expect(markdown).toContain('Local fallback');
  });

  test('pipeline reports fallback mode when a remote AI provider fails', async () => {
    const originalEnv = {
      AI_PROVIDER: process.env.AI_PROVIDER,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
    };

    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash-lite';
    globalThis.fetch = async () =>
      new Response('{"error":"temporary test failure"}', { status: 500 });
    resetEnvCache();

    try {
      const result = await runPipeline(
        makeOptions({
          role: 'qa',
          limit: 1,
          output: path.join(OUTPUT_ROOT, 'remote-fallback'),
          fallback: false,
        })
      );

      expect(result.summary.aiProvider).toBe('gemini');
      expect(result.summary.usedFallback).toBe(true);
      expect(result.matches.every((match) => match.analysis.fallbackMode)).toBe(true);

      const markdown = fs.readFileSync(result.outputFiles.markdown, 'utf-8');
      expect(markdown).toContain('gemini selected; local fallback used');
    } finally {
      process.env.AI_PROVIDER = originalEnv.AI_PROVIDER;
      process.env.GEMINI_API_KEY = originalEnv.GEMINI_API_KEY;
      process.env.GEMINI_MODEL = originalEnv.GEMINI_MODEL;
      globalThis.fetch = originalFetch;
      resetEnvCache();
    }
  });

  test('markdown summary and JSON outputs contain the expected data', async () => {
    const outputDir = path.join(OUTPUT_ROOT, 'outputs');
    const result = await runPipeline(makeOptions({ role: 'all', output: outputDir }));

    const markdown = fs.readFileSync(result.outputFiles.markdown, 'utf-8');
    expect(markdown).toContain('# Execution Summary');
    expect(markdown).toContain('## Top 5 Job Matches');
    expect(markdown).toContain('## Candidate Compatibility Notes');
    expect(markdown).toMatch(/\[[^\]]+\]\(https?:\/\//);
    expect(markdown).not.toContain(path.basename(RESUME_PATH));
    expect(markdown).not.toContain(RESUME_PATH);

    expect(result.summary).not.toHaveProperty('resumeFile');
    expect(result.summary.resumeFormat).toBe('txt');
    expect(result.summary.resumeCharacterCount).toBeGreaterThan(0);

    const jobsRaw = JSON.parse(fs.readFileSync(result.outputFiles.jobsRaw, 'utf-8'));
    expect(Array.isArray(jobsRaw)).toBe(true);
    expect(jobsRaw.length).toBe(result.summary.jobsCollected);

    const resumeAnalysis = JSON.parse(fs.readFileSync(result.outputFiles.resumeAnalysis, 'utf-8'));
    expect(resumeAnalysis.technicalSkills).toEqual(expect.arrayContaining(['JavaScript']));
    // privacy: direct identifiers and raw resume text must never be persisted
    expect(JSON.stringify(resumeAnalysis)).not.toContain('alex.santos.demo@example.com');
    expect(JSON.stringify(resumeAnalysis)).not.toContain('Alex Ferreira Santos');
    expect(JSON.stringify(resumeAnalysis)).not.toContain('Sao Paulo, Brazil');

    const matches = JSON.parse(fs.readFileSync(result.outputFiles.jobMatches, 'utf-8'));
    expect(matches.length).toBe(result.matches.length);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        source: expect.any(String),
        workMode: expect.any(String),
        location: expect.any(String),
        url: expect.stringMatching(/^https?:\/\//),
        candidateWarnings: expect.any(Array),
      })
    );
  });

  test('a job with an empty title generates a high severity QA issue', () => {
    const fixtures: ScrapedJob[] = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../fixtures/sample-jobs.json'), 'utf-8')
    );
    const emptyTitleJob = fixtures.find((j) => j.title === '')!;
    expect(emptyTitleJob).toBeDefined();

    const validation = validateJob(emptyTitleJob);
    expect(validation.isValid).toBe(false);
    expect(validation.status).toBe('invalid');
    expect(validation.issues.some((i) => i.field === 'title' && i.severity === 'high')).toBe(true);
  });
});
