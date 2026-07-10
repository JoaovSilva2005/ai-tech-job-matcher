import { getEnv } from '../../config/env';
import { nowIso } from '../../utils/date';
import { logger } from '../../utils/logger';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { matchesRequestedRole } from '../sourceFilters';
import { normalizeWorkMode } from '../normalizeWorkMode';
import type { ScrapedJob, ScrapeOptions, TechRole } from '../types';
import { fetchPublicJson } from './publicApiUtils';

const JOOBLE_API = 'https://jooble.org/api';
const MAX_JOOBLE_JOBS = 20;

interface JoobleResponse {
  jobs?: JoobleJob[];
}

interface JoobleJob {
  id?: number | string;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
}

export async function scrapeJoobleJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const env = getEnv();
  const limit = Math.min(options.limit, MAX_JOOBLE_JOBS);
  const payload = await fetchPublicJson<JoobleResponse>(
    `${JOOBLE_API}/${encodeURIComponent(env.JOOBLE_API_KEY)}`,
    'Jooble',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        keywords: keywordsForRole(options.role),
        location: options.location?.trim() || env.JOOBLE_LOCATION,
        radius: '80',
        page: '1',
        ResultOnPage: limit,
        companysearch: 'false',
      }),
    }
  );

  const scrapedAt = nowIso();
  const jobs = (payload.jobs ?? [])
    .map((entry) => mapJoobleJob(entry, scrapedAt))
    .filter((job): job is ScrapedJob => Boolean(job))
    .filter((job) => matchesRequestedRole(options.role, job.title, job.description))
    .slice(0, limit);

  if (jobs.length > 0) logger.info(`Jooble: collected ${jobs.length} public Brazilian job(s).`);
  else logger.warn('Jooble: no matching jobs found for the requested role and location.');
  return jobs;
}

export function mapJoobleJob(entry: JoobleJob, scrapedAt: string): ScrapedJob | null {
  const title = normalizeWhitespace(entry.title ?? '');
  const company = normalizeWhitespace(entry.company ?? '');
  const url = normalizeWhitespace(entry.link ?? '');
  const snippet = normalizeWhitespace(stripHtml(entry.snippet ?? ''));
  if (!title || !company || !url || snippet.length < 20) return null;

  const location = normalizeWhitespace(entry.location ?? '') || 'Not specified';
  const metadata = [
    entry.type ? `Employment: ${entry.type}.` : '',
    entry.salary ? `Salary: ${entry.salary}.` : '',
    entry.source ? `Original board: ${entry.source}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: `jooble-${entry.id ?? slugForId(title, company)}`,
    title,
    company,
    location,
    workMode: normalizeWorkMode(`${title} ${location} ${snippet}`),
    url,
    description: normalizeWhitespace(`Source: Jooble REST API. ${metadata} ${snippet}`),
    source: 'jooble',
    scrapedAt,
    publishedAt: normalizeDate(entry.updated),
    availability: 'active',
  };
}

function keywordsForRole(role: TechRole | undefined): string {
  const keywords: Partial<Record<TechRole, string>> = {
    qa: 'QA, software testing, analista de testes',
    frontend: 'frontend developer',
    backend: 'backend developer',
    fullstack: 'full stack developer',
    mobile: 'mobile developer',
    data: 'data analyst, data engineer',
    devops: 'devops, cloud engineer',
    support: 'technical support, service desk',
    internship: 'estágio tecnologia, software intern',
    all: 'software developer, QA, data, devops, technical support',
  };
  return keywords[role ?? 'all'] ?? keywords.all!;
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
