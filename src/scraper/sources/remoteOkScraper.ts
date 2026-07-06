import { request } from 'playwright';
import type { ScrapedJob, ScrapeOptions } from '../types';
import { nowIso } from '../../utils/date';
import { normalizeWorkMode } from './sampleHtmlScraper';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { logger } from '../../utils/logger';

const REMOTEOK_API = 'https://remoteok.com/api';
const MAX_REMOTE_JOBS = 15; // ethical low limit: one request, few items
const REQUEST_TIMEOUT_MS = 15_000;

interface RemoteOkEntry {
  id?: string | number;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  description?: string;
  tags?: string[];
}

/**
 * Best-effort real source. RemoteOK exposes a public JSON API that requires
 * no login and no scraping tricks; their terms ask for attribution and a
 * link back, which the generated report preserves through the original URL.
 *
 * Ethics: a single GET request with a low item cap, honest User-Agent and a
 * timeout. Any failure returns an empty list so the pipeline (and the demo)
 * never depends on network availability — use the "sample" source for that.
 */
export async function scrapeRemoteOkJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const limit = Math.min(options.limit, MAX_REMOTE_JOBS);
  const context = await request.newContext({
    extraHTTPHeaders: {
      'User-Agent': 'ai-tech-job-matcher (portfolio project; single request; contact via GitHub)',
    },
    timeout: REQUEST_TIMEOUT_MS,
  });

  try {
    const response = await context.get(REMOTEOK_API);
    if (!response.ok()) {
      logger.warn(`RemoteOK API returned status ${response.status()}; skipping this source.`);
      return [];
    }

    const data = (await response.json()) as RemoteOkEntry[];
    // First array item is a legal/attribution notice, not a job
    const entries = data.filter((entry) => entry && entry.position && entry.company);

    const scrapedAt = nowIso();
    const jobs: ScrapedJob[] = entries.slice(0, limit).map((entry, index) => ({
      id: `remoteok-${entry.id ?? index}`,
      title: normalizeWhitespace(String(entry.position)),
      company: normalizeWhitespace(String(entry.company)),
      location: entry.location ? normalizeWhitespace(entry.location) : 'Remote',
      workMode: normalizeWorkMode('remote'),
      url: entry.url ?? '',
      description: normalizeWhitespace(stripHtml(entry.description ?? '')).slice(0, 4000),
      source: 'remoteok',
      scrapedAt,
    }));

    logger.info(`RemoteOK: collected ${jobs.length} public job entries.`);
    return jobs;
  } catch (error) {
    logger.warn(
      `RemoteOK source unavailable (${(error as Error).message}); returning no jobs. ` +
        'Use --source sample for a fully offline run.'
    );
    return [];
  } finally {
    await context.dispose();
  }
}
