import type { JobSource } from '../cli/cliTypes';
import type { ScrapedJob, ScrapeOptions } from './types';
import { getScraper } from './sourceRegistry';
import { logger } from '../utils/logger';

/**
 * Facade over the source registry: picks the right scraper and applies
 * shared behavior (logging + defensive limit handling).
 */
export async function scrapeJobs(source: JobSource, options: ScrapeOptions): Promise<ScrapedJob[]> {
  logger.info(`Collecting jobs from source "${source}" (limit: ${options.limit})...`);
  const scraper = getScraper(source);
  const jobs = await scraper(options);
  logger.info(`Collected ${jobs.length} job(s) from "${source}".`);
  return jobs.slice(0, options.limit);
}
