import { expect, test } from '@playwright/test';
import { removeDuplicateJobs } from '../../src/qa/duplicateDetector';
import type { ScrapedJob } from '../../src/scraper/types';

function makeJob(overrides: Partial<ScrapedJob> = {}): ScrapedJob {
  return {
    id: `job-${Math.random().toString(36).slice(2)}`,
    title: 'QA Junior Engineer',
    company: 'Acme',
    workMode: 'remote',
    url: 'https://jobs.example.com/acme/qa-junior',
    description: 'Description long enough for testing duplicate detection behaviors in the suite.',
    source: 'test',
    scrapedAt: new Date().toISOString(),
    ...overrides,
  };
}

test.describe('removeDuplicateJobs', () => {
  test('keeps the first occurrence and removes same title+company duplicates', () => {
    const original = makeJob({ id: 'a' });
    const duplicate = makeJob({ id: 'b', url: 'https://other-board.example.com/qa-junior' });
    const { unique, duplicates } = removeDuplicateJobs([original, duplicate]);
    expect(unique).toHaveLength(1);
    expect(unique[0].id).toBe('a');
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].id).toBe('b');
  });

  test('detects duplicates by normalized URL even with different titles', () => {
    const original = makeJob({ id: 'a', title: 'QA Junior Engineer' });
    const duplicate = makeJob({
      id: 'b',
      title: 'QA Jr. Engineer (repost)',
      url: 'https://jobs.example.com/acme/qa-junior?utm_source=partner',
    });
    const { unique, duplicates } = removeDuplicateJobs([original, duplicate]);
    expect(unique).toHaveLength(1);
    expect(duplicates).toHaveLength(1);
  });

  test('normalizes case and whitespace in title/company comparison', () => {
    const original = makeJob({ id: 'a', title: 'QA  Junior   Engineer', company: 'ACME' });
    const duplicate = makeJob({
      id: 'b',
      title: 'qa junior engineer',
      company: 'acme',
      url: 'https://another.example.com/1',
    });
    const { unique } = removeDuplicateJobs([original, duplicate]);
    expect(unique).toHaveLength(1);
  });

  test('keeps genuinely different jobs', () => {
    const jobs = [
      makeJob({ id: 'a', title: 'QA Junior Engineer', url: 'https://x.example.com/1' }),
      makeJob({ id: 'b', title: 'Frontend Developer', url: 'https://x.example.com/2' }),
      makeJob({
        id: 'c',
        title: 'QA Junior Engineer',
        company: 'Other Co',
        url: 'https://x.example.com/3',
      }),
    ];
    const { unique, duplicates } = removeDuplicateJobs(jobs);
    expect(unique).toHaveLength(3);
    expect(duplicates).toHaveLength(0);
  });

  test('handles empty input', () => {
    const { unique, duplicates } = removeDuplicateJobs([]);
    expect(unique).toHaveLength(0);
    expect(duplicates).toHaveLength(0);
  });
});
