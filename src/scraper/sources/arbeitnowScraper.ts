import { nowIso } from '../../utils/date';
import { logger } from '../../utils/logger';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { matchesRequestedRole } from '../sourceFilters';
import type { ScrapedJob, ScrapeOptions, WorkMode } from '../types';
import { fetchPublicJson } from './publicApiUtils';
import { readThroughCache } from './sourceCache';

const ARBEITNOW_API = 'https://www.arbeitnow.com/api/job-board-api';
const ARBEITNOW_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_ARBEITNOW_JOBS = 20;

interface ArbeitnowResponse {
  data?: ArbeitnowJob[];
}

interface ArbeitnowJob {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
}

export async function scrapeArbeitnowJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const payload = await readThroughCache('arbeitnow:first-page', ARBEITNOW_CACHE_TTL_MS, () =>
    fetchPublicJson<ArbeitnowResponse>(ARBEITNOW_API, 'Arbeitnow')
  );
  const scrapedAt = nowIso();
  const limit = Math.min(options.limit, MAX_ARBEITNOW_JOBS);
  const jobs = (payload.data ?? [])
    .map((entry) => mapArbeitnowJob(entry, scrapedAt))
    .filter((job): job is ScrapedJob => Boolean(job))
    .filter((job) => matchesRequestedRole(options.role, job.title, job.description))
    .slice(0, limit);

  if (jobs.length > 0) logger.info(`Arbeitnow: collected ${jobs.length} public tech job(s).`);
  else logger.warn('Arbeitnow: no matching tech jobs found in the current public feed.');
  return jobs;
}

export function mapArbeitnowJob(entry: ArbeitnowJob, scrapedAt: string): ScrapedJob | null {
  const title = normalizeWhitespace(entry.title ?? '');
  const company = normalizeWhitespace(entry.company_name ?? '');
  const url = normalizeWhitespace(entry.url ?? '');
  const description = normalizeWhitespace(stripHtml(entry.description ?? '')).slice(0, 4000);
  if (!title || !company || !url || description.length < 60) return null;

  const location = normalizeWhitespace(entry.location ?? '') || 'Not specified';
  const metadata = `Tags: ${(entry.tags ?? []).join(', ') || 'not specified'}. Employment: ${(entry.job_types ?? []).join(', ') || 'not specified'}.`;

  return {
    id: `arbeitnow-${entry.slug ?? slugForId(title, company)}`,
    title,
    company,
    location,
    workMode: arbeitnowWorkMode(entry, description),
    url,
    description: normalizeWhitespace(`Source: Arbeitnow public API. ${metadata} ${description}`),
    source: 'arbeitnow',
    scrapedAt,
    publishedAt: normalizeUnixDate(entry.created_at),
    availability: 'active',
  };
}

function arbeitnowWorkMode(entry: ArbeitnowJob, description: string): WorkMode {
  if (entry.remote === true) return 'remote';
  const inferred = normalizeWorkMode(`${entry.title ?? ''} ${entry.location ?? ''} ${description}`);
  if (inferred === 'remote' || inferred === 'hybrid') return 'hybrid';
  return 'onsite';
}

function normalizeUnixDate(value: number | undefined): string | undefined {
  if (!Number.isFinite(value)) return undefined;
  return new Date((value as number) * 1000).toISOString();
}

function slugForId(title: string, company: string): string {
  return `${company}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
