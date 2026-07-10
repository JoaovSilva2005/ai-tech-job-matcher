import type { ScrapedJob, ScrapeOptions, TechRole } from '../types';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { classifyRole, isLikelyTechJobTitle } from '../../matcher/classifyRole';
import { logger } from '../../utils/logger';
import { fetchPublicJson } from './publicApiUtils';
import { SourceUnavailableError } from '../sourceErrors';

const REMOTIVE_API = 'https://remotive.com/api/remote-jobs';
const MAX_REMOTIVE_JOBS = 20; // ethical low cap on what we keep per run

interface RemotiveEntry {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  job_type?: string;
  candidate_required_location?: string;
  description?: string;
  publication_date?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveEntry[];
}

/**
 * Client-side role filter. Remotive's free public API returns a fixed feed of
 * the most recent jobs across ALL categories and ignores query parameters
 * (category/search/limit), so we classify each job with the project's own
 * classifier and keep only the requested role. "all" means every recognized
 * tech role; internship remains broad for the pipeline's detailed analysis.
 *
 * Exposed for unit testing.
 */
export function jobMatchesRole(
  role: TechRole | undefined,
  title: string,
  description: string
): boolean {
  if (!role || role === 'unknown' || role === 'internship') return true;
  if (role === 'all') return isLikelyTechJobTitle(title);
  const classifiedRole = classifyRole(title, description);
  return classifiedRole === role;
}

/**
 * Best-effort real source (Remotive public API — no key, no login).
 * Ethics mirror the RemoteOK source: a single GET request, honest User-Agent,
 * timeout, low result cap and explicit failure reporting. It never retries or
 * bypasses anything. Each job keeps its original Remotive URL so attribution
 * and the apply link are preserved.
 */
export async function scrapeRemotiveJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const payload = await fetchPublicJson<unknown>(REMOTIVE_API, 'Remotive');
  if (!isRemotiveResponse(payload)) {
    throw new SourceUnavailableError('Remotive', 'Remotive returned an invalid payload');
  }

  const entries = payload.jobs.filter((entry) => entry && entry.title && entry.company_name);
  logger.debug(`Remotive returned ${entries.length} job(s) in its public feed.`);

  const scrapedAt = nowIso();
  const limit = Math.min(options.limit, MAX_REMOTIVE_JOBS);
  const jobs: ScrapedJob[] = [];
  for (const entry of entries) {
    const title = normalizeWhitespace(String(entry.title));
    const description = buildDescription(entry);
    if (!jobMatchesRole(options.role, title, description)) continue;

    jobs.push({
      id: `remotive-${entry.id ?? jobs.length}`,
      title,
      company: normalizeWhitespace(String(entry.company_name)),
      location: entry.candidate_required_location
        ? normalizeWhitespace(entry.candidate_required_location)
        : 'Remote',
      workMode: 'remote',
      url: entry.url ?? '',
      description,
      source: 'remotive',
      scrapedAt,
      publishedAt: normalizePublishedAt(entry.publication_date),
      availability: 'active',
    });
    if (jobs.length >= limit) break;
  }

  const roleNote = options.role && options.role !== 'all' ? ` matching role "${options.role}"` : '';
  if (jobs.length === 0) {
    logger.warn(
      `Remotive: no jobs${roleNote} in the current public feed (${entries.length} recent jobs scanned). ` +
        'The free feed only exposes the latest postings; try again later or use --role all.'
    );
  } else {
    logger.info(`Remotive: collected ${jobs.length} public job(s)${roleNote}.`);
  }
  return jobs;
}

function isRemotiveResponse(value: unknown): value is Required<Pick<RemotiveResponse, 'jobs'>> {
  return Boolean(
    value && typeof value === 'object' && Array.isArray((value as RemotiveResponse).jobs)
  );
}

function normalizePublishedAt(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function buildDescription(entry: RemotiveEntry): string {
  // Prefix with job type/location so short listings still pass the
  // minimum-description QA rule and carry useful signal for the analyzer.
  const meta = [
    entry.job_type ? `Job type: ${entry.job_type.replace(/_/g, ' ')}.` : '',
    entry.candidate_required_location ? `Location: ${entry.candidate_required_location}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const body = normalizeWhitespace(stripHtml(entry.description ?? '')).slice(0, 4000);
  return normalizeWhitespace(`${meta} ${body}`);
}
