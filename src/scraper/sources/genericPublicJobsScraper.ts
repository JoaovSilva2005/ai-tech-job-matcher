import { chromium } from 'playwright';
import type { ScrapedJob, ScrapeOptions } from '../types';
import { getEnv } from '../../config/env';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace } from '../../utils/text';
import { logger } from '../../utils/logger';
import { normalizeWorkMode } from './sampleHtmlScraper';

const MAX_GENERIC_JOBS = 10; // conservative cap for a best-effort source
const NAVIGATION_TIMEOUT_MS = 20_000;

// Common selector patterns found on simple public job boards
const CANDIDATE_CARD_SELECTORS = [
  'article.job-card',
  '[data-testid*="job"]',
  '.job-listing',
  '.job-item',
  'li.job',
  'article',
];

/**
 * Best-effort generic scraper for a user-provided PUBLIC job board URL
 * (GENERIC_JOBS_URL in .env). It never handles logins, captchas or
 * anti-bot walls: if the page does not load or no job-like content is
 * found, it simply returns an empty list and logs a warning.
 */
export async function scrapeGenericPublicJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const env = getEnv();
  if (!env.GENERIC_JOBS_URL) {
    logger.warn(
      'GENERIC_JOBS_URL is not configured in .env; the "generic" source has nothing to scrape. ' +
        'Use --source sample for the offline demo.'
    );
    return [];
  }

  const limit = Math.min(options.limit, MAX_GENERIC_JOBS);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(env.GENERIC_JOBS_URL, {
      waitUntil: 'domcontentloaded',
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    for (const selector of CANDIDATE_CARD_SELECTORS) {
      const cards = page.locator(selector);
      const count = await cards.count();
      if (count < 2) continue;

      logger.debug(`Generic scraper matched selector "${selector}" (${count} elements)`);
      const scrapedAt = nowIso();
      const jobs: ScrapedJob[] = [];

      for (let i = 0; i < Math.min(count, limit); i++) {
        const card = cards.nth(i);
        const text = normalizeWhitespace((await card.innerText().catch(() => '')) ?? '');
        if (text.length < 60) continue;

        const heading = normalizeWhitespace(
          (await card
            .locator('h1, h2, h3, .title, .job-title')
            .first()
            .innerText()
            .catch(() => '')) ?? ''
        );
        const link = await card
          .locator('a')
          .first()
          .getAttribute('href')
          .catch(() => null);

        jobs.push({
          id: `generic-${i + 1}`,
          title: heading || text.slice(0, 80),
          company: 'Unknown (generic source)',
          location: undefined,
          workMode: normalizeWorkMode(text),
          url: link ? new URL(link, env.GENERIC_JOBS_URL).toString() : env.GENERIC_JOBS_URL,
          description: text.slice(0, 4000),
          source: 'generic',
          scrapedAt,
        });
      }

      if (jobs.length > 0) {
        logger.info(`Generic source: collected ${jobs.length} entries (best effort).`);
        return jobs;
      }
    }

    logger.warn('Generic source: no job-like content found on the configured page.');
    return [];
  } catch (error) {
    logger.warn(
      `Generic source failed (${(error as Error).message}); returning no jobs. ` +
        'This source is best-effort by design — see docs/scraping-ethics.md.'
    );
    return [];
  } finally {
    await browser.close();
  }
}
