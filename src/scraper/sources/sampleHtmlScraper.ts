import path from 'path';
import { pathToFileURL } from 'url';
import { chromium } from 'playwright';
import type { ScrapedJob, ScrapeOptions } from '../types';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { sampleSelectors } from '../selectors/sampleSelectors';
import { fileExists } from '../../utils/fileSystem';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace } from '../../utils/text';
import { logger } from '../../utils/logger';

const SAMPLE_FILE = path.resolve(__dirname, '../../../samples/sample-jobs.html');

/**
 * Scrapes the local sample job board with a real Playwright browser.
 * Using a file:// page keeps the demo 100% offline and deterministic while
 * still exercising the same navigation + extraction flow a real scraper uses.
 */
export async function scrapeSampleJobs(
  options: ScrapeOptions,
  sampleFilePath: string = SAMPLE_FILE
): Promise<ScrapedJob[]> {
  if (!fileExists(sampleFilePath)) {
    throw new Error(`Sample jobs file not found: ${sampleFilePath}`);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(sampleFilePath).toString(), { waitUntil: 'domcontentloaded' });

    const cards = page.locator(sampleSelectors.jobCard);
    const totalCards = await cards.count();
    const scrapedAt = nowIso();
    const jobs: ScrapedJob[] = [];

    const textOf = async (card: ReturnType<typeof cards.nth>, selector: string) => {
      const element = card.locator(selector).first();
      return (await element.count()) > 0 ? ((await element.textContent()) ?? '').trim() : '';
    };

    for (let i = 0; i < Math.min(totalCards, options.limit); i++) {
      const card = cards.nth(i);
      const description = await textOf(card, sampleSelectors.description);
      const urlElement = card.locator(sampleSelectors.url).first();
      const url = (await urlElement.count()) > 0 ? await urlElement.getAttribute('href') : '';

      jobs.push({
        id: (await card.getAttribute('data-job-id')) ?? `sample-${i + 1}`,
        title: normalizeWhitespace(await textOf(card, sampleSelectors.title)),
        company: normalizeWhitespace(await textOf(card, sampleSelectors.company)),
        location: normalizeWhitespace(await textOf(card, sampleSelectors.location)) || undefined,
        workMode: normalizeWorkMode(await textOf(card, sampleSelectors.workMode)),
        url: String(url ?? ''),
        description: normalizeWhitespace(description),
        source: 'sample',
        scrapedAt,
        availability: 'active',
        rawText: description,
      });
    }

    logger.debug(`Sample scraper extracted ${jobs.length} of ${totalCards} job cards`);
    return jobs;
  } finally {
    await browser.close();
  }
}
