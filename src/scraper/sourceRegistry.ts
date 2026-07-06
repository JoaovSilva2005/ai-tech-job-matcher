import type { JobSource } from '../cli/cliTypes';
import type { ScraperFn } from './types';
import { scrapeSampleJobs } from './sources/sampleHtmlScraper';
import { scrapeRemoteOkJobs } from './sources/remoteOkScraper';
import { scrapeRemotiveJobs } from './sources/remotiveScraper';
import { scrapeGenericPublicJobs } from './sources/genericPublicJobsScraper';

const registry: Record<JobSource, ScraperFn> = {
  sample: (options) => scrapeSampleJobs(options),
  remoteok: scrapeRemoteOkJobs,
  remotive: scrapeRemotiveJobs,
  generic: scrapeGenericPublicJobs,
};

export function getScraper(source: JobSource): ScraperFn {
  const scraper = registry[source];
  if (!scraper) {
    throw new Error(`Unknown job source "${source}"`);
  }
  return scraper;
}
