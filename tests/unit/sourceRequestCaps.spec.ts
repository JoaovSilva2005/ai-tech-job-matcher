import { expect, test } from '@playwright/test';
import { resetEnvCache } from '../../src/config/env';
import { scrapeGreenhouseJobs } from '../../src/scraper/sources/greenhouseScraper';
import { scrapeLeverJobs } from '../../src/scraper/sources/leverScraper';

test.describe('public ATS request caps', () => {
  test('checks at most five configured Greenhouse boards per run', async () => {
    const originalValue = process.env.GREENHOUSE_BOARD_TOKENS;
    const originalFetch = globalThis.fetch;
    let requests = 0;
    process.env.GREENHOUSE_BOARD_TOKENS = 'one,two,three,four,five,six,seven';
    resetEnvCache();
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json({ jobs: [] });
    };

    try {
      await scrapeGreenhouseJobs({ limit: 20, role: 'all' });
      expect(requests).toBe(5);
    } finally {
      restoreEnv('GREENHOUSE_BOARD_TOKENS', originalValue);
      globalThis.fetch = originalFetch;
    }
  });

  test('checks at most five configured Lever companies per run', async () => {
    const originalValue = process.env.LEVER_COMPANY_SLUGS;
    const originalFetch = globalThis.fetch;
    let requests = 0;
    process.env.LEVER_COMPANY_SLUGS = 'one,two,three,four,five,six,seven';
    resetEnvCache();
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json([]);
    };

    try {
      await scrapeLeverJobs({ limit: 20, role: 'all' });
      expect(requests).toBe(5);
    } finally {
      restoreEnv('LEVER_COMPANY_SLUGS', originalValue);
      globalThis.fetch = originalFetch;
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  resetEnvCache();
}
