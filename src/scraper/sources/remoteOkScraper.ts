import type { ScrapedJob, ScrapeOptions } from '../types';
import { nowIso } from '../../utils/date';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { logger } from '../../utils/logger';
import { matchesRequestedRole } from '../sourceFilters';
import { fetchPublicJson } from './publicApiUtils';
import { SourceUnavailableError } from '../sourceErrors';

const REMOTEOK_API = 'https://remoteok.com/api';
const MAX_REMOTE_JOBS = 15; // ethical low limit: one request, few items

interface RemoteOkEntry {
  id?: string | number;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  description?: string;
  tags?: string[];
  date?: string;
}

/**
 * Best-effort real source. RemoteOK exposes a public JSON API that requires
 * no login and no scraping tricks; their terms ask for attribution and a
 * link back, which the generated report preserves through the original URL.
 *
 * Ethics: a single GET request with a low item cap, honest User-Agent and a
 * timeout. Failures are reported explicitly so health checks can distinguish
 * an outage from a valid empty response.
 */
export async function scrapeRemoteOkJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const limit = Math.min(options.limit, MAX_REMOTE_JOBS);
  const payload = await fetchPublicJson<unknown>(REMOTEOK_API, 'RemoteOK');
  if (!Array.isArray(payload)) {
    throw new SourceUnavailableError('RemoteOK', 'RemoteOK returned an invalid payload');
  }

  // First array item is a legal/attribution notice, not a job.
  const entries = (payload as RemoteOkEntry[]).filter(
    (entry) => entry && entry.position && entry.company
  );
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];

  for (const entry of entries) {
    const title = normalizeWhitespace(String(entry.position));
    const description = normalizeWhitespace(stripHtml(entry.description ?? '')).slice(0, 4000);
    if (!jobMatchesRequestedRole(options.role, title, description)) continue;

    jobs.push({
      id: `remoteok-${entry.id ?? jobs.length}`,
      title,
      company: normalizeWhitespace(String(entry.company)),
      location: entry.location ? normalizeWhitespace(entry.location) : 'Remote',
      workMode: normalizeWorkMode('remote'),
      url: normalizeRemoteOkUrl(entry.url, entry.id),
      description,
      source: 'remoteok',
      scrapedAt,
      publishedAt: normalizePublishedAt(entry.date),
      availability: 'active',
    });
    if (jobs.length >= limit) break;
  }

  logger.info(`RemoteOK: collected ${jobs.length} public job entries.`);
  return jobs;
}

function jobMatchesRequestedRole(
  role: ScrapeOptions['role'],
  title: string,
  description: string
): boolean {
  return matchesRequestedRole(role, title, description);
}

function normalizeRemoteOkUrl(url: string | undefined, id: string | number | undefined): string {
  if (url?.startsWith('http://') || url?.startsWith('https://')) return url;
  if (url?.startsWith('/')) return new URL(url, 'https://remoteok.com').toString();
  return id ? `https://remoteok.com/remote-jobs/${id}` : '';
}

function normalizePublishedAt(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}
