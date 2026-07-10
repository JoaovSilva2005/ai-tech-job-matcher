import type { ScrapedJob, ScrapeOptions } from '../types';
import { getEnv } from '../../config/env';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { logger } from '../../utils/logger';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { matchesRequestedRole } from '../sourceFilters';
import { fetchPublicJson, parseCommaList } from './publicApiUtils';

const GREENHOUSE_API = 'https://boards-api.greenhouse.io/v1/boards';
const MAX_GREENHOUSE_JOBS = 20;
const MAX_GREENHOUSE_BOARDS = 5;
const DEFAULT_GREENHOUSE_TOKENS = ['stripe'];

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

interface GreenhouseJob {
  id?: number;
  title?: string;
  absolute_url?: string;
  content?: string;
  location?: { name?: string };
  company_name?: string;
  updated_at?: string;
  departments?: { name?: string }[];
  offices?: { name?: string; location?: string }[];
}

export async function scrapeGreenhouseJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const envTokens = parseCommaList(getEnv().GREENHOUSE_BOARD_TOKENS);
  const configuredTokens = envTokens.length > 0 ? envTokens : DEFAULT_GREENHOUSE_TOKENS;
  const boardTokens = configuredTokens.slice(0, MAX_GREENHOUSE_BOARDS);
  if (configuredTokens.length > MAX_GREENHOUSE_BOARDS) {
    logger.warn(`Greenhouse: using only the first ${MAX_GREENHOUSE_BOARDS} configured boards.`);
  }
  const limit = Math.min(options.limit, MAX_GREENHOUSE_JOBS);
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];
  let successfulRequests = 0;
  let lastError: Error | undefined;

  for (const token of boardTokens) {
    const url = `${GREENHOUSE_API}/${encodeURIComponent(token)}/jobs?content=true`;
    let data: GreenhouseResponse;
    try {
      data = await fetchPublicJson<GreenhouseResponse>(url, `Greenhouse (${token})`);
      successfulRequests += 1;
    } catch (error) {
      lastError = error as Error;
      logger.warn(lastError.message);
      continue;
    }

    for (const entry of data.jobs ?? []) {
      const job = mapGreenhouseJob(entry, token, scrapedAt);
      if (!job) continue;
      if (!matchesRequestedRole(options.role, job.title, job.description)) continue;

      jobs.push(job);
      if (jobs.length >= limit) break;
    }

    if (jobs.length >= limit) break;
  }

  if (successfulRequests === 0 && lastError) throw lastError;

  if (jobs.length === 0) {
    logger.warn(
      'Greenhouse: no matching jobs found. Configure GREENHOUSE_BOARD_TOKENS with public board tokens if needed.'
    );
  } else {
    logger.info(`Greenhouse: collected ${jobs.length} public job(s).`);
  }
  return jobs;
}

export function mapGreenhouseJob(
  entry: GreenhouseJob,
  boardToken: string,
  scrapedAt: string
): ScrapedJob | null {
  const title = normalizeWhitespace(entry.title ?? '');
  const company = normalizeWhitespace(entry.company_name ?? humanizeBoardToken(boardToken));
  const url = normalizeWhitespace(entry.absolute_url ?? '');
  const description = normalizeWhitespace(stripHtml(stripHtml(entry.content ?? ''))).slice(0, 4000);

  if (!title || !company || !url || description.length < 60) return null;

  const location =
    normalizeWhitespace(entry.location?.name ?? '') ||
    (entry.offices ?? [])
      .map((office) => normalizeWhitespace(office.location ?? office.name ?? ''))
      .filter(Boolean)
      .join(', ');
  const departments = (entry.departments ?? [])
    .map((department) => normalizeWhitespace(department.name ?? ''))
    .filter(Boolean)
    .join(', ');

  return {
    id: `greenhouse-${boardToken}-${entry.id ?? slugForId(title, company)}`,
    title,
    company,
    location: location || 'Not specified',
    workMode: normalizeWorkMode(`${title} ${location} ${description}`),
    url,
    description: normalizeWhitespace(
      `Source: Greenhouse public Job Board API. Department: ${
        departments || 'not specified'
      }. ${description}`
    ),
    source: 'greenhouse',
    scrapedAt,
    publishedAt: normalizePublishedAt(entry.updated_at),
    availability: 'active',
  };
}

function normalizePublishedAt(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function humanizeBoardToken(token: string): string {
  return token
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
