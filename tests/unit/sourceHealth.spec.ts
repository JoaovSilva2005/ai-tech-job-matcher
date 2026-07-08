import { expect, test } from '@playwright/test';
import { checkPublicSources, hasBlockingSourceFailure } from '../../src/scraper/sourceHealth';
import type { PublicJobSource } from '../../src/cli/cliTypes';
import type { ScrapedJob } from '../../src/scraper/types';

const baseJob: ScrapedJob = {
  id: 'job-1',
  title: 'QA Analyst',
  company: 'Acme',
  location: 'Remote',
  workMode: 'remote',
  url: 'https://example.com/job',
  description: 'QA role with Playwright, API testing and bug reports.',
  source: 'gupy',
  scrapedAt: '2026-07-08T00:00:00.000Z',
};

test.describe('public source health check', () => {
  test('marks a source as ok when it returns jobs', async () => {
    const results = await checkPublicSources({
      sources: ['gupy'],
      scrape: async () => [baseJob],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      source: 'gupy',
      status: 'ok',
      jobsFound: 1,
      sampleTitles: ['QA Analyst'],
    });
  });

  test('marks a source as empty when it returns no jobs', async () => {
    const results = await checkPublicSources({
      sources: ['lever'],
      scrape: async () => [],
    });

    expect(results[0].status).toBe('empty');
    expect(results[0].jobsFound).toBe(0);
  });

  test('marks a source as failed when the scraper throws', async () => {
    const results = await checkPublicSources({
      sources: ['remoteok'],
      scrape: async () => {
        throw new Error('network unavailable');
      },
    });

    expect(results[0].status).toBe('failed');
    expect(results[0].error).toContain('network unavailable');
  });

  test('only blocks when every checked source failed', () => {
    expect(
      hasBlockingSourceFailure([
        result('gupy', 'failed'),
        result('remotive', 'failed'),
      ])
    ).toBe(true);

    expect(
      hasBlockingSourceFailure([
        result('gupy', 'ok'),
        result('lever', 'empty'),
        result('remoteok', 'failed'),
      ])
    ).toBe(false);
  });
});

function result(source: PublicJobSource, status: 'ok' | 'empty' | 'failed') {
  return {
    source,
    status,
    jobsFound: status === 'ok' ? 1 : 0,
    durationMs: 1,
    sampleTitles: [],
  };
}
