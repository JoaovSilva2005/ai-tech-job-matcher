import { getEnv } from '../../config/env';
import { nowIso } from '../../utils/date';
import { logger } from '../../utils/logger';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { matchesRequestedRole } from '../sourceFilters';
import type { ScrapedJob, ScrapeOptions, WorkMode } from '../types';
import { fetchPublicJson, parseCommaList } from './publicApiUtils';

const ASHBY_API = 'https://api.ashbyhq.com/posting-api/job-board';
const MAX_ASHBY_BOARDS = 5;
const MAX_ASHBY_JOBS = 20;

interface AshbyResponse {
  jobs?: AshbyJob[];
}

interface AshbyJob {
  id?: string;
  title?: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  publishedAt?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensation?: { compensationTierSummary?: string };
}

export async function scrapeAshbyJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const configuredBoards = parseCommaList(getEnv().ASHBY_BOARD_NAMES);
  const boards = configuredBoards.slice(0, MAX_ASHBY_BOARDS);
  const limit = Math.min(options.limit, MAX_ASHBY_JOBS);
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];
  let successfulRequests = 0;
  let lastError: Error | undefined;

  if (configuredBoards.length > MAX_ASHBY_BOARDS) {
    logger.warn(`Ashby: using only the first ${MAX_ASHBY_BOARDS} configured boards.`);
  }

  for (const board of boards) {
    try {
      const url = `${ASHBY_API}/${encodeURIComponent(board)}?includeCompensation=true`;
      const data = await fetchPublicJson<AshbyResponse>(url, `Ashby (${board})`);
      successfulRequests += 1;

      for (const entry of data.jobs ?? []) {
        const job = mapAshbyJob(entry, board, scrapedAt);
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
  logResult('Ashby', jobs.length);
  return jobs;
}

export function mapAshbyJob(
  entry: AshbyJob,
  boardName: string,
  scrapedAt: string
): ScrapedJob | null {
  if (entry.isListed === false) return null;

  const title = normalizeWhitespace(entry.title ?? '');
  const company = humanizeIdentifier(boardName);
  const url = normalizeWhitespace(entry.applyUrl ?? entry.jobUrl ?? '');
  const description = normalizeWhitespace(
    entry.descriptionPlain ?? stripHtml(entry.descriptionHtml ?? '')
  ).slice(0, 4000);
  if (!title || !company || !url || description.length < 60) return null;

  const locations = [
    entry.location,
    ...(entry.secondaryLocations ?? []).map((item) => item.location),
  ]
    .map((value) => normalizeWhitespace(value ?? ''))
    .filter(Boolean);
  const location = [...new Set(locations)].join(', ') || 'Not specified';
  const metadata = [
    `Department: ${entry.department || 'not specified'}.`,
    `Team: ${entry.team || 'not specified'}.`,
    `Employment: ${entry.employmentType || 'not specified'}.`,
    entry.compensation?.compensationTierSummary
      ? `Compensation: ${entry.compensation.compensationTierSummary}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: `ashby-${boardName}-${entry.id ?? slugForId(title, company)}`,
    title,
    company,
    location,
    workMode: mapAshbyWorkMode(entry.workplaceType, entry.isRemote),
    url,
    description: normalizeWhitespace(
      `Source: Ashby public Job Postings API. ${metadata} ${description}`
    ),
    source: 'ashby',
    scrapedAt,
    publishedAt: normalizeDate(entry.publishedAt),
    availability: 'active',
  };
}

function mapAshbyWorkMode(
  workplaceType: string | undefined,
  isRemote: boolean | undefined
): WorkMode {
  const normalized = workplaceType?.toLowerCase();
  if (normalized === 'hybrid') return 'hybrid';
  if (normalized === 'remote' || isRemote === true) return 'remote';
  if (normalized === 'onsite' || normalized === 'on-site' || isRemote === false) return 'onsite';
  return 'unknown';
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

function logResult(source: string, count: number): void {
  if (count > 0) logger.info(`${source}: collected ${count} public job(s).`);
  else logger.warn(`${source}: no matching public jobs found.`);
}
