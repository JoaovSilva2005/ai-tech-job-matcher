import type { ScrapedJob, ScrapeOptions } from '../types';
import { getEnv } from '../../config/env';
import { classifyRole } from '../../matcher/classifyRole';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { logger } from '../../utils/logger';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { fetchPublicJson, parseCommaList } from './publicApiUtils';

const LEVER_API = 'https://api.lever.co/v0/postings';
const MAX_LEVER_JOBS = 20;

interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  description?: string;
  descriptionPlain?: string;
  additional?: string;
  additionalPlain?: string;
  createdAt?: number;
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
  };
  lists?: { text?: string; content?: string }[];
}

export async function scrapeLeverJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const companySlugs = parseCommaList(getEnv().LEVER_COMPANY_SLUGS);
  if (companySlugs.length === 0) {
    logger.warn(
      'LEVER_COMPANY_SLUGS is not configured in .env; the "lever" source has nothing to collect.'
    );
    return [];
  }

  const limit = Math.min(options.limit, MAX_LEVER_JOBS);
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];
  let successfulRequests = 0;
  let lastError: Error | undefined;

  for (const slug of companySlugs) {
    const url = `${LEVER_API}/${encodeURIComponent(slug)}?mode=json`;
    let data: LeverPosting[];
    try {
      const payload = await fetchPublicJson<unknown>(url, `Lever (${slug})`);
      if (!Array.isArray(payload)) throw new Error(`Lever (${slug}) returned an invalid payload`);
      data = payload as LeverPosting[];
      successfulRequests += 1;
    } catch (error) {
      lastError = error as Error;
      logger.warn(lastError.message);
      continue;
    }

    for (const entry of data) {
      const job = mapLeverPosting(entry, slug, scrapedAt);
      if (!job) continue;
      if (!jobMatchesRequestedRole(options.role, job)) continue;

      jobs.push(job);
      if (jobs.length >= limit) break;
    }

    if (jobs.length >= limit) break;
  }

  if (successfulRequests === 0 && lastError) throw lastError;

  if (jobs.length === 0) {
    logger.warn('Lever: no matching jobs found for the configured company slug(s).');
  } else {
    logger.info(`Lever: collected ${jobs.length} public job(s).`);
  }
  return jobs;
}

export function mapLeverPosting(
  entry: LeverPosting,
  companySlug: string,
  scrapedAt: string
): ScrapedJob | null {
  const title = normalizeWhitespace(entry.text ?? '');
  const company = humanizeCompanySlug(companySlug);
  const url = normalizeWhitespace(entry.hostedUrl ?? entry.applyUrl ?? '');
  const listText = (entry.lists ?? [])
    .map((item) => `${item.text ?? ''}. ${item.content ?? ''}`)
    .join(' ');
  const description = normalizeWhitespace(
    stripHtml(
      [
        entry.descriptionPlain ?? entry.description ?? '',
        entry.additionalPlain ?? entry.additional ?? '',
        listText,
      ].join(' ')
    )
  ).slice(0, 4000);

  if (!title || !company || !url || description.length < 60) return null;

  const location = normalizeWhitespace(entry.categories?.location ?? '');
  const department = normalizeWhitespace(
    entry.categories?.team ?? entry.categories?.department ?? 'not specified'
  );
  const commitment = normalizeWhitespace(entry.categories?.commitment ?? 'not specified');

  return {
    id: `lever-${companySlug}-${entry.id ?? slugForId(title, company)}`,
    title,
    company,
    location: location || 'Not specified',
    workMode: normalizeWorkMode(`${title} ${location} ${description}`),
    url,
    description: normalizeWhitespace(
      `Source: Lever public Postings API. Department: ${department}. Commitment: ${commitment}. ${description}`
    ),
    source: 'lever',
    scrapedAt,
    publishedAt: normalizePublishedAt(entry.createdAt),
    availability: 'active',
  };
}

function normalizePublishedAt(value: number | undefined): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function jobMatchesRequestedRole(role: ScrapeOptions['role'], job: ScrapedJob): boolean {
  if (!role || role === 'all' || role === 'internship' || role === 'unknown') return true;
  return classifyRole(job.title, job.description) === role;
}

function humanizeCompanySlug(slug: string): string {
  return slug
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
