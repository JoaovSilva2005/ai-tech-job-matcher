import type { JobSource } from '../cli/cliTypes';
import type { ScraperFn } from './types';
import { scrapeSampleJobs } from './sources/sampleHtmlScraper';
import { scrapeRemoteOkJobs } from './sources/remoteOkScraper';
import { scrapeRemotiveJobs } from './sources/remotiveScraper';
import { scrapeTheMuseJobs } from './sources/theMuseScraper';
import { scrapeGreenhouseJobs } from './sources/greenhouseScraper';
import { scrapeLeverJobs } from './sources/leverScraper';

const registry: Record<JobSource, ScraperFn> = {
  sample: (options) => scrapeSampleJobs(options),
  remoteok: scrapeRemoteOkJobs,
  remotive: scrapeRemotiveJobs,
  themuse: scrapeTheMuseJobs,
  greenhouse: scrapeGreenhouseJobs,
  lever: scrapeLeverJobs,
};

export function getScraper(source: JobSource): ScraperFn {
  const scraper = registry[source];
  if (!scraper) {
    throw new Error(`Unknown job source "${source}"`);
  }
  return scraper;
}
