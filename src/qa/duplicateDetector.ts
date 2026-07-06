import type { ScrapedJob } from '../scraper/types';
import { normalizeWhitespace } from '../utils/text';
import { normalizeUrl } from '../utils/url';

export interface DuplicateDetectionResult {
  unique: ScrapedJob[];
  duplicates: ScrapedJob[];
}

function normalizedKey(job: ScrapedJob): string {
  const title = normalizeWhitespace(job.title).toLowerCase();
  const company = normalizeWhitespace(job.company).toLowerCase();
  return `${title}::${company}`;
}

/**
 * A job is considered a duplicate when either:
 * - the normalized URL was already seen, or
 * - the normalized (title + company) pair was already seen.
 * The first occurrence is kept; later ones are reported as duplicates.
 */
export function removeDuplicateJobs(jobs: ScrapedJob[]): DuplicateDetectionResult {
  const seenKeys = new Set<string>();
  const seenUrls = new Set<string>();
  const unique: ScrapedJob[] = [];
  const duplicates: ScrapedJob[] = [];

  for (const job of jobs) {
    const key = normalizedKey(job);
    const url = normalizeUrl(job.url).toLowerCase();
    const urlIsUsable = url.startsWith('http');

    if (seenKeys.has(key) || (urlIsUsable && seenUrls.has(url))) {
      duplicates.push(job);
      continue;
    }

    seenKeys.add(key);
    if (urlIsUsable) seenUrls.add(url);
    unique.push(job);
  }

  return { unique, duplicates };
}
