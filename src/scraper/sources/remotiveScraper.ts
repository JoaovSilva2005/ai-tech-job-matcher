import { request } from 'playwright';
import type { ScrapedJob, ScrapeOptions, TechRole } from '../types';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { classifyRole } from '../../matcher/classifyRole';
import { logger } from '../../utils/logger';

const REMOTIVE_API = 'https://remotive.com/api/remote-jobs';
const MAX_REMOTIVE_JOBS = 20; // ethical low cap on what we keep per run
const REQUEST_TIMEOUT_MS = 15_000;

interface RemotiveEntry {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  job_type?: string;
  candidate_required_location?: string;
  description?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveEntry[];
}

/**
 * Client-side role filter. Remotive's free public API returns a fixed feed of
 * the most recent jobs across ALL categories and ignores query parameters
 * (category/search/limit), so we classify each job with the project's own
 * classifier and keep only the requested role. For "all"/"internship" we keep
 * everything and let the main pipeline apply the precise (analysis-based) filter.
 *
 * Exposed for unit testing.
 */
export function jobMatchesRole(
  role: TechRole | undefined,
  title: string,
  description: string
): boolean {
  if (!role || role === 'all' || role === 'internship' || role === 'unknown') {
    return true;
  }
  return classifyRole(title, description) === role;
}

/**
 * Best-effort real source (Remotive public API — no key, no login).
 * Ethics mirror the RemoteOK source: a single GET request, honest User-Agent,
 * timeout, low result cap and graceful failure (returns an empty list, never
 * retries or bypasses anything). Each job keeps its original Remotive URL so
 * attribution and the apply link are preserved.
 */
export async function scrapeRemotiveJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const context = await request.newContext({
    extraHTTPHeaders: {
      'User-Agent': 'ai-tech-job-matcher (portfolio project; single request; contact via GitHub)',
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  try {
    const response = await context.get(REMOTIVE_API);
    if (!response.ok()) {
      logger.warn(`Remotive API returned status ${response.status()}; skipping this source.`);
      return [];
    }

    const data = (await response.json()) as RemotiveResponse;
    const entries = (data.jobs ?? []).filter(
      (entry) => entry && entry.title && entry.company_name
    );
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
      });
      if (jobs.length >= limit) break;
    }

    const roleNote =
      options.role && options.role !== 'all' ? ` matching role "${options.role}"` : '';
    if (jobs.length === 0) {
      logger.warn(
        `Remotive: no jobs${roleNote} in the current public feed (${entries.length} recent jobs scanned). ` +
          'The free feed only exposes the latest ~30 postings; try again later or use --role all.'
      );
    } else {
      logger.info(`Remotive: collected ${jobs.length} public job(s)${roleNote}.`);
    }
    return jobs;
  } catch (error) {
    logger.warn(
      `Remotive source unavailable (${(error as Error).message}); returning no jobs. ` +
        'Try another real source such as --source themuse or --source greenhouse.'
    );
    return [];
  } finally {
    await context.dispose();
  }
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
