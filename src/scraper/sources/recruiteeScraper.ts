import { getEnv } from '../../config/env';
import { nowIso } from '../../utils/date';
import { logger } from '../../utils/logger';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { matchesRequestedRole } from '../sourceFilters';
import type { ScrapedJob, ScrapeOptions, WorkMode } from '../types';
import { fetchPublicJson, parseCommaList } from './publicApiUtils';

const MAX_RECRUITEE_COMPANIES = 5;
const MAX_RECRUITEE_JOBS = 20;

interface RecruiteeResponse {
  offers?: RecruiteeOffer[];
}

interface RecruiteeOffer {
  id?: number | string;
  title?: string;
  slug?: string;
  status?: string;
  company_name?: string;
  description?: string;
  requirements?: string;
  department?: string;
  employment_type?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  locations?: { name?: string; city?: string; state?: string; country?: string }[];
  remote?: boolean;
  hybrid?: boolean;
  on_site?: boolean;
  careers_url?: string;
  careers_apply_url?: string;
  created_at?: string;
  updated_at?: string;
}

export async function scrapeRecruiteeJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const configured = parseCommaList(getEnv().RECRUITEE_COMPANY_SUBDOMAINS);
  const subdomains = configured.slice(0, MAX_RECRUITEE_COMPANIES);
  const limit = Math.min(options.limit, MAX_RECRUITEE_JOBS);
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];
  let successfulRequests = 0;
  let lastError: Error | undefined;

  if (configured.length > MAX_RECRUITEE_COMPANIES) {
    logger.warn(`Recruitee: using only the first ${MAX_RECRUITEE_COMPANIES} configured companies.`);
  }

  for (const subdomain of subdomains) {
    if (!isSafeSubdomain(subdomain)) {
      logger.warn(`Recruitee: ignored invalid company subdomain "${subdomain}".`);
      continue;
    }
    try {
      const payload = await fetchPublicJson<RecruiteeResponse | RecruiteeOffer[]>(
        `https://${subdomain}.recruitee.com/api/offers/`,
        `Recruitee (${subdomain})`
      );
      successfulRequests += 1;
      const offers = Array.isArray(payload) ? payload : (payload.offers ?? []);
      for (const entry of offers) {
        const job = mapRecruiteeOffer(entry, subdomain, scrapedAt);
        if (!job || !matchesRequestedRole(options.role, job.title, job.description)) continue;
        jobs.push(job);
        if (jobs.length >= limit) break;
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(lastError.message);
    }
    if (jobs.length >= limit) break;
  }

  if (successfulRequests === 0 && lastError) throw lastError;
  if (jobs.length > 0) logger.info(`Recruitee: collected ${jobs.length} public job(s).`);
  else logger.warn('Recruitee: no matching public jobs found for the configured companies.');
  return jobs;
}

export function mapRecruiteeOffer(
  entry: RecruiteeOffer,
  subdomain: string,
  scrapedAt: string
): ScrapedJob | null {
  if (entry.status && entry.status.toLowerCase() !== 'published') return null;

  const title = normalizeWhitespace(entry.title ?? '');
  const company = normalizeWhitespace(entry.company_name ?? humanizeIdentifier(subdomain));
  const url = normalizeWhitespace(entry.careers_apply_url ?? entry.careers_url ?? '');
  const body = normalizeWhitespace(
    `${stripHtml(entry.description ?? '')} ${stripHtml(entry.requirements ?? '')}`
  ).slice(0, 4000);
  if (!title || !company || !url || body.length < 60) return null;

  const locations = [
    entry.location,
    joinLocation(entry.city, entry.state, entry.country),
    ...(entry.locations ?? []).map(
      (item) => item.name || joinLocation(item.city, item.state, item.country)
    ),
  ]
    .map((value) => normalizeWhitespace(value ?? ''))
    .filter(Boolean);
  const location = [...new Set(locations)].join(', ') || 'Not specified';

  return {
    id: `recruitee-${subdomain}-${entry.id ?? entry.slug ?? slugForId(title, company)}`,
    title,
    company,
    location,
    workMode: mapRecruiteeWorkMode(entry),
    url,
    description: normalizeWhitespace(
      `Source: Recruitee Careers Site API. Department: ${entry.department || 'not specified'}. Employment: ${entry.employment_type || 'not specified'}. ${body}`
    ),
    source: 'recruitee',
    scrapedAt,
    publishedAt: normalizeDate(entry.updated_at ?? entry.created_at),
    availability: 'active',
  };
}

function mapRecruiteeWorkMode(entry: RecruiteeOffer): WorkMode {
  if (entry.hybrid) return 'hybrid';
  if (entry.remote) return 'remote';
  if (entry.on_site) return 'onsite';
  return 'unknown';
}

function isSafeSubdomain(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value);
}

function joinLocation(...parts: (string | undefined)[]): string {
  return parts
    .map((part) => normalizeWhitespace(part ?? ''))
    .filter(Boolean)
    .join(', ');
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function slugForId(title: string, company: string): string {
  return `${company}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}
