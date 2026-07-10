import type { ScrapedJob, ScrapeOptions } from '../types';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { logger } from '../../utils/logger';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { matchesRequestedRole } from '../sourceFilters';
import { fetchPublicJson } from './publicApiUtils';

const THE_MUSE_API = 'https://www.themuse.com/api/public/jobs';
const MAX_THE_MUSE_JOBS = 20;

interface TheMuseResponse {
  results?: TheMuseJob[];
}

interface TheMuseJob {
  id?: number;
  name?: string;
  contents?: string;
  publication_date?: string;
  locations?: { name?: string }[];
  categories?: { name?: string }[];
  levels?: { name?: string; short_name?: string }[];
  refs?: { landing_page?: string };
  company?: { name?: string };
}

export async function scrapeTheMuseJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const limit = Math.min(options.limit, MAX_THE_MUSE_JOBS);
  const url = `${THE_MUSE_API}?page=1&category=${encodeURIComponent('Computer and IT')}`;
  const data = await fetchPublicJson<TheMuseResponse>(url, 'The Muse');

  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];
  for (const entry of data.results ?? []) {
    const job = mapTheMuseJob(entry, scrapedAt);
    if (!job) continue;
    if (!matchesRequestedRole(options.role, job.title, job.description)) continue;

    jobs.push(job);
    if (jobs.length >= limit) break;
  }

  if (jobs.length === 0) {
    logger.warn('The Muse: no matching Computer and IT jobs found in the first public API page.');
  } else {
    logger.info(`The Muse: collected ${jobs.length} public job(s).`);
  }
  return jobs;
}

export function mapTheMuseJob(entry: TheMuseJob, scrapedAt: string): ScrapedJob | null {
  const title = normalizeWhitespace(entry.name ?? '');
  const company = normalizeWhitespace(entry.company?.name ?? '');
  const url = normalizeWhitespace(entry.refs?.landing_page ?? '');
  const description = normalizeWhitespace(stripHtml(entry.contents ?? '')).slice(0, 4000);

  if (!title || !company || !url || description.length < 60) return null;

  const location = (entry.locations ?? [])
    .map((item) => normalizeWhitespace(item.name ?? ''))
    .filter(Boolean)
    .join(', ');
  const level = (entry.levels ?? [])
    .map((item) => item.name)
    .filter(Boolean)
    .join(', ');
  const category = (entry.categories ?? [])
    .map((item) => item.name)
    .filter(Boolean)
    .join(', ');
  const enrichedDescription = normalizeWhitespace(
    `Source: The Muse. Level: ${level || 'not specified'}. Category: ${
      category || 'Computer and IT'
    }. ${description}`
  );

  return {
    id: `themuse-${entry.id ?? slugForId(title, company)}`,
    title,
    company,
    location: location || 'Not specified',
    workMode: normalizeWorkMode(`${title} ${location} ${description}`),
    url,
    description: enrichedDescription,
    source: 'themuse',
    scrapedAt,
    publishedAt: normalizePublishedAt(entry.publication_date),
    availability: 'active',
  };
}

function normalizePublishedAt(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function slugForId(title: string, company: string): string {
  return `${company}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
