import { expect, test } from '@playwright/test';
import { resetEnvCache } from '../../src/config/env';
import { scrapeGreenhouseJobs } from '../../src/scraper/sources/greenhouseScraper';
import { scrapeLeverJobs } from '../../src/scraper/sources/leverScraper';
import { scrapeAshbyJobs } from '../../src/scraper/sources/ashbyScraper';
import { scrapeRecruiteeJobs } from '../../src/scraper/sources/recruiteeScraper';
import { scrapeSmartRecruitersJobs } from '../../src/scraper/sources/smartRecruitersScraper';
import { scrapeJsonLdJobs } from '../../src/scraper/sources/jsonLdScraper';
import { scrapeJobicyJobs } from '../../src/scraper/sources/jobicyScraper';
import { resetSourceCache } from '../../src/scraper/sources/sourceCache';

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

  test('checks at most five configured Ashby boards per run', async () => {
    const originalValue = process.env.ASHBY_BOARD_NAMES;
    const originalFetch = globalThis.fetch;
    let requests = 0;
    process.env.ASHBY_BOARD_NAMES = 'one,two,three,four,five,six';
    resetEnvCache();
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json({ jobs: [] });
    };

    try {
      await scrapeAshbyJobs({ limit: 20, role: 'all' });
      expect(requests).toBe(5);
    } finally {
      restoreEnv('ASHBY_BOARD_NAMES', originalValue);
      globalThis.fetch = originalFetch;
    }
  });

  test('checks at most five configured Recruitee companies per run', async () => {
    const originalValue = process.env.RECRUITEE_COMPANY_SUBDOMAINS;
    const originalFetch = globalThis.fetch;
    let requests = 0;
    process.env.RECRUITEE_COMPANY_SUBDOMAINS = 'one,two,three,four,five,six';
    resetEnvCache();
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json({ offers: [] });
    };

    try {
      await scrapeRecruiteeJobs({ limit: 20, role: 'all' });
      expect(requests).toBe(5);
    } finally {
      restoreEnv('RECRUITEE_COMPANY_SUBDOMAINS', originalValue);
      globalThis.fetch = originalFetch;
    }
  });

  test('checks at most three configured SmartRecruiters companies per run', async () => {
    const originalValue = process.env.SMARTRECRUITERS_COMPANY_IDS;
    const originalFetch = globalThis.fetch;
    let requests = 0;
    process.env.SMARTRECRUITERS_COMPANY_IDS = 'one,two,three,four';
    resetEnvCache();
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json({ content: [] });
    };

    try {
      await scrapeSmartRecruitersJobs({ limit: 20, role: 'all' });
      expect(requests).toBe(3);
    } finally {
      restoreEnv('SMARTRECRUITERS_COMPANY_IDS', originalValue);
      globalThis.fetch = originalFetch;
    }
  });

  test('checks at most five authorized JSON-LD pages including robots.txt', async () => {
    const originalValue = process.env.JSONLD_JOB_URLS;
    const originalFetch = globalThis.fetch;
    let requests = 0;
    process.env.JSONLD_JOB_URLS = [1, 2, 3, 4, 5, 6]
      .map((number) => `https://careers${number}.example.org/jobs/qa`)
      .join(',');
    resetEnvCache();
    globalThis.fetch = async (url) => {
      requests += 1;
      return String(url).endsWith('/robots.txt')
        ? new Response('User-agent: *\nAllow: /')
        : new Response('<html><body>No structured data</body></html>');
    };

    try {
      await scrapeJsonLdJobs({ limit: 20, role: 'all' });
      expect(requests).toBe(10);
    } finally {
      restoreEnv('JSONLD_JOB_URLS', originalValue);
      globalThis.fetch = originalFetch;
    }
  });

  test('skips private JSON-LD URLs and pages disallowed by robots.txt', async () => {
    const originalValue = process.env.JSONLD_JOB_URLS;
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];
    process.env.JSONLD_JOB_URLS = 'http://127.0.0.1/jobs/qa,https://careers.example.org/private/qa';
    resetEnvCache();
    globalThis.fetch = async (url) => {
      requestedUrls.push(String(url));
      return new Response('User-agent: *\nDisallow: /private');
    };

    try {
      await expect(scrapeJsonLdJobs({ limit: 20, role: 'all' })).resolves.toEqual([]);
      expect(requestedUrls).toEqual(['https://careers.example.org/robots.txt']);
    } finally {
      restoreEnv('JSONLD_JOB_URLS', originalValue);
      globalThis.fetch = originalFetch;
    }
  });

  test('caches the Jobicy feed for one hour', async () => {
    const originalGeo = process.env.JOBICY_GEO;
    const originalFetch = globalThis.fetch;
    let requests = 0;
    process.env.JOBICY_GEO = '';
    resetEnvCache();
    resetSourceCache();
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json({ jobs: [] });
    };

    try {
      await scrapeJobicyJobs({ limit: 5, role: 'qa' });
      await scrapeJobicyJobs({ limit: 10, role: 'all' });
      expect(requests).toBe(1);
    } finally {
      restoreEnv('JOBICY_GEO', originalGeo);
      resetSourceCache();
      globalThis.fetch = originalFetch;
    }
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  resetEnvCache();
}
