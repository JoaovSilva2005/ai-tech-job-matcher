import type { JobIssue, ScrapedJob } from '../scraper/types';
import { isValidUrl } from '../utils/url';

export const MIN_DESCRIPTION_LENGTH = 100;
export const GENERIC_DESCRIPTION_LENGTH = 180;

export type ValidationRule = (job: ScrapedJob) => JobIssue | null;

export const validationRules: ValidationRule[] = [
  function titleNotEmpty(job) {
    if (!job.title || job.title.trim().length === 0) {
      return { field: 'title', severity: 'high', message: 'Job title is empty' };
    }
    return null;
  },
  function companyNotEmpty(job) {
    if (!job.company || job.company.trim().length === 0) {
      return { field: 'company', severity: 'high', message: 'Company name is empty' };
    }
    return null;
  },
  function urlIsValid(job) {
    if (!isValidUrl(job.url)) {
      return { field: 'url', severity: 'high', message: `Invalid job URL: "${job.url}"` };
    }
    return null;
  },
  function descriptionMinLength(job) {
    const length = (job.description ?? '').trim().length;
    if (length < MIN_DESCRIPTION_LENGTH) {
      return {
        field: 'description',
        severity: 'medium',
        message: `Description too short (${length} chars, minimum ${MIN_DESCRIPTION_LENGTH})`,
      };
    }
    return null;
  },
  function descriptionNotGeneric(job) {
    const length = (job.description ?? '').trim().length;
    if (length >= MIN_DESCRIPTION_LENGTH && length < GENERIC_DESCRIPTION_LENGTH) {
      return {
        field: 'description',
        severity: 'low',
        message: 'Description looks generic/short; details may be missing',
      };
    }
    return null;
  },
  function workModeNormalized(job) {
    if (job.workMode === 'unknown') {
      return {
        field: 'workMode',
        severity: 'low',
        message: 'Work mode could not be determined (remote/hybrid/onsite)',
      };
    }
    return null;
  },
  function scrapedAtPresent(job) {
    if (!job.scrapedAt || Number.isNaN(Date.parse(job.scrapedAt))) {
      return { field: 'scrapedAt', severity: 'low', message: 'Missing or invalid scrape timestamp' };
    }
    return null;
  },
];
