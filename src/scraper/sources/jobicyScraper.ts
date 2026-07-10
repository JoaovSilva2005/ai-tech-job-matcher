import { getEnv } from '../../config/env';
import { nowIso } from '../../utils/date';
import { logger } from '../../utils/logger';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { matchesRequestedRole } from '../sourceFilters';
import type { ScrapedJob, ScrapeOptions } from '../types';
import { fetchPublicJson } from './publicApiUtils';
import { readThroughCache } from './sourceCache';

const JOBICY_API = 'https://jobicy.com/api/v2/remote-jobs';
const JOBICY_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_JOBICY_JOBS = 20;

interface JobicyResponse {
  jobs?: JobicyJob[];
}

interface JobicyJob {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string | string[];
  jobType?: string;
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
}

export async function scrapeJobicyJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const geo = getEnv().JOBICY_GEO.trim().toLowerCase();
  const safeGeo = /^[a-z0-9-]+$/.test(geo) ? geo : '';
  const url = `${JOBICY_API}?count=100${safeGeo ? `&geo=${encodeURIComponent(safeGeo)}` : ''}`;
  const payload = await readThroughCache(`jobicy:${safeGeo || 'all'}`, JOBICY_CACHE_TTL_MS, () =>
    fetchPublicJson<JobicyResponse>(url, 'Jobicy')
  );
  const scrapedAt = nowIso();
  const limit = Math.min(options.limit, MAX_JOBICY_JOBS);
  const jobs = (payload.jobs ?? [])
    .map((entry) => mapJobicyJob(entry, scrapedAt))
    .filter((job): job is ScrapedJob => Boolean(job))
    .filter((job) => matchesRequestedRole(options.role, job.title, job.description))
    .slice(0, limit);

  if (jobs.length > 0) logger.info(`Jobicy: collected ${jobs.length} public remote job(s).`);
  else logger.warn('Jobicy: no matching remote tech jobs found in the current public feed.');
  return jobs;
}

export function mapJobicyJob(entry: JobicyJob, scrapedAt: string): ScrapedJob | null {
  const title = normalizeWhitespace(entry.jobTitle ?? '');
  const company = normalizeWhitespace(entry.companyName ?? '');
  const url = normalizeWhitespace(entry.url ?? '');
  const description = normalizeWhitespace(
    stripHtml(entry.jobDescription ?? entry.jobExcerpt ?? '')
  ).slice(0, 4000);
  if (!title || !company || !url || description.length < 60) return null;

  const industry = Array.isArray(entry.jobIndustry)
    ? entry.jobIndustry.join(', ')
    : entry.jobIndustry;
  const salary = formatSalary(entry);
  const metadata = `Industry: ${industry || 'not specified'}. Employment: ${entry.jobType || 'not specified'}. Level: ${entry.jobLevel || 'not specified'}.${salary ? ` Salary: ${salary}.` : ''}`;

  return {
    id: `jobicy-${entry.id ?? slugForId(title, company)}`,
    title,
    company,
    location: normalizeWhitespace(entry.jobGeo ?? '') || 'Remote',
    workMode: 'remote',
    url,
    description: normalizeWhitespace(`Source: Jobicy public API. ${metadata} ${description}`),
    source: 'jobicy',
    scrapedAt,
    publishedAt: normalizeDate(entry.pubDate),
    availability: 'active',
  };
}

function formatSalary(entry: JobicyJob): string {
  if (entry.salaryMin === undefined && entry.salaryMax === undefined) return '';
  const range = [entry.salaryMin, entry.salaryMax].filter((value) => value !== undefined).join('-');
  return `${entry.salaryCurrency ?? ''} ${range} ${entry.salaryPeriod ?? ''}`.trim();
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function slugForId(title: string, company: string): string {
  return `${company}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
