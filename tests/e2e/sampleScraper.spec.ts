import { expect, test } from '@playwright/test';
import { scrapeSampleJobs } from '../../src/scraper/sources/sampleHtmlScraper';
import { validateJob } from '../../src/scraper/validateJob';
import { removeDuplicateJobs } from '../../src/qa/duplicateDetector';

test.describe('sample HTML scraper (Playwright browser)', () => {
  test('extracts at least 16 jobs with all required fields', async () => {
    const jobs = await scrapeSampleJobs({ limit: 50 });
    expect(jobs.length).toBeGreaterThanOrEqual(16);

    for (const job of jobs) {
      expect(job.title.length, `job ${job.id} title`).toBeGreaterThan(0);
      expect(job.company.length, `job ${job.id} company`).toBeGreaterThan(0);
      expect(job.url, `job ${job.id} url`).toMatch(/^https?:\/\//);
      expect(job.description.length, `job ${job.id} description`).toBeGreaterThanOrEqual(100);
      expect(['remote', 'hybrid', 'onsite', 'unknown']).toContain(job.workMode);
      expect(job.source).toBe('sample');
      expect(Date.parse(job.scrapedAt)).not.toBeNaN();
    }
  });

  test('respects the limit option', async () => {
    const jobs = await scrapeSampleJobs({ limit: 5 });
    expect(jobs).toHaveLength(5);
  });

  test('all scraped jobs pass QA validation', async () => {
    const jobs = await scrapeSampleJobs({ limit: 50 });
    for (const job of jobs) {
      const validation = validateJob(job);
      expect(validation.isValid, `job ${job.id} should be valid`).toBe(true);
    }
  });

  test('the sample board contains an intentional duplicate that gets removed', async () => {
    const jobs = await scrapeSampleJobs({ limit: 50 });
    const { unique, duplicates } = removeDuplicateJobs(jobs);
    expect(duplicates.length).toBeGreaterThanOrEqual(1);
    expect(unique.length).toBe(jobs.length - duplicates.length);
  });
});
