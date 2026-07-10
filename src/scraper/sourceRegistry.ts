import type { JobSource } from '../cli/cliTypes';
import type { ScraperFn } from './types';
import { scrapeSampleJobs } from './sources/sampleHtmlScraper';
import { scrapeRemoteOkJobs } from './sources/remoteOkScraper';
import { scrapeRemotiveJobs } from './sources/remotiveScraper';
import { scrapeTheMuseJobs } from './sources/theMuseScraper';
import { scrapeGreenhouseJobs } from './sources/greenhouseScraper';
import { scrapeGupyJobs } from './sources/gupyScraper';
import { scrapeLeverJobs } from './sources/leverScraper';
import { getEnv } from '../config/env';
import { parseCommaList } from './sources/publicApiUtils';

const registry: Record<JobSource, ScraperFn> = {
  sample: (options) => scrapeSampleJobs(options),
  remoteok: scrapeRemoteOkJobs,
  remotive: scrapeRemotiveJobs,
  themuse: scrapeTheMuseJobs,
  greenhouse: scrapeGreenhouseJobs,
  gupy: scrapeGupyJobs,
  lever: scrapeLeverJobs,
};

export function getScraper(source: JobSource): ScraperFn {
  const scraper = registry[source];
  if (!scraper) {
    throw new Error(`Unknown job source "${source}"`);
  }
  return scraper;
}

export interface SourceConfiguration {
  configured: boolean;
  reason?: string;
}

export function getSourceConfiguration(source: JobSource): SourceConfiguration {
  if (source === 'lever' && parseCommaList(getEnv().LEVER_COMPANY_SLUGS).length === 0) {
    return {
      configured: false,
      reason: 'LEVER_COMPANY_SLUGS is not configured',
    };
  }
  return { configured: true };
}
