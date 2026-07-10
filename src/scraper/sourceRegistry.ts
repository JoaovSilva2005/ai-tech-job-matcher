import type { JobSource } from '../cli/cliTypes';
import type { ScraperFn } from './types';
import { scrapeSampleJobs } from './sources/sampleHtmlScraper';
import { scrapeRemoteOkJobs } from './sources/remoteOkScraper';
import { scrapeRemotiveJobs } from './sources/remotiveScraper';
import { scrapeTheMuseJobs } from './sources/theMuseScraper';
import { scrapeGreenhouseJobs } from './sources/greenhouseScraper';
import { scrapeGupyJobs } from './sources/gupyScraper';
import { scrapeLeverJobs } from './sources/leverScraper';
import { scrapeAshbyJobs } from './sources/ashbyScraper';
import { scrapeRecruiteeJobs } from './sources/recruiteeScraper';
import { scrapeJoobleJobs } from './sources/joobleScraper';
import { scrapeSmartRecruitersJobs } from './sources/smartRecruitersScraper';
import { scrapeJobicyJobs } from './sources/jobicyScraper';
import { scrapeArbeitnowJobs } from './sources/arbeitnowScraper';
import { scrapeJsonLdJobs } from './sources/jsonLdScraper';
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
  ashby: scrapeAshbyJobs,
  recruitee: scrapeRecruiteeJobs,
  jooble: scrapeJoobleJobs,
  smartrecruiters: scrapeSmartRecruitersJobs,
  jobicy: scrapeJobicyJobs,
  arbeitnow: scrapeArbeitnowJobs,
  jsonld: scrapeJsonLdJobs,
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
  const env = getEnv();
  if (source === 'lever' && parseCommaList(env.LEVER_COMPANY_SLUGS).length === 0) {
    return {
      configured: false,
      reason: 'LEVER_COMPANY_SLUGS is not configured',
    };
  }
  if (source === 'ashby' && parseCommaList(env.ASHBY_BOARD_NAMES).length === 0) {
    return { configured: false, reason: 'ASHBY_BOARD_NAMES is not configured' };
  }
  if (source === 'recruitee' && parseCommaList(env.RECRUITEE_COMPANY_SUBDOMAINS).length === 0) {
    return {
      configured: false,
      reason: 'RECRUITEE_COMPANY_SUBDOMAINS is not configured',
    };
  }
  if (source === 'jooble' && env.JOOBLE_API_KEY.trim().length === 0) {
    return { configured: false, reason: 'JOOBLE_API_KEY is not configured' };
  }
  if (
    source === 'smartrecruiters' &&
    parseCommaList(env.SMARTRECRUITERS_COMPANY_IDS).length === 0
  ) {
    return {
      configured: false,
      reason: 'SMARTRECRUITERS_COMPANY_IDS is not configured',
    };
  }
  if (source === 'jsonld' && parseCommaList(env.JSONLD_JOB_URLS).length === 0) {
    return { configured: false, reason: 'JSONLD_JOB_URLS is not configured' };
  }
  return { configured: true };
}
