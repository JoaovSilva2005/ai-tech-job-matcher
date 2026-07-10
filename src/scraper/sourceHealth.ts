import { VALID_SOURCES } from '../cli/cliTypes';
import type { PublicJobSource } from '../cli/cliTypes';
import type { ScrapedJob, ScrapeOptions, ScraperFn, TechRole } from './types';
import { getScraper, getSourceConfiguration } from './sourceRegistry';
import type { SourceConfiguration } from './sourceRegistry';

export type SourceHealthStatus = 'ok' | 'empty' | 'unconfigured' | 'failed';

export interface SourceHealthResult {
  source: PublicJobSource;
  status: SourceHealthStatus;
  jobsFound: number;
  durationMs: number;
  sampleTitles: string[];
  error?: string;
}

export interface SourceHealthOptions {
  sources?: PublicJobSource[];
  limit?: number;
  role?: TechRole;
  timeoutMs?: number;
  scrape?: (source: PublicJobSource, options: ScrapeOptions) => Promise<ScrapedJob[]>;
  configuration?: (source: PublicJobSource) => SourceConfiguration;
}

const DEFAULT_HEALTH_LIMIT = 3;
const DEFAULT_HEALTH_TIMEOUT_MS = 20_000;

export async function checkPublicSources(
  options: SourceHealthOptions = {}
): Promise<SourceHealthResult[]> {
  const sources = options.sources ?? VALID_SOURCES;
  const limit = options.limit ?? DEFAULT_HEALTH_LIMIT;
  const role = options.role ?? 'all';
  const timeoutMs = options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  const scrape = options.scrape ?? scrapeSource;
  const configuration = options.configuration ?? getSourceConfiguration;

  return Promise.all(
    sources.map((source) => {
      const sourceConfiguration = configuration(source);
      if (!sourceConfiguration.configured) {
        return {
          source,
          status: 'unconfigured' as const,
          jobsFound: 0,
          durationMs: 0,
          sampleTitles: [],
          error: sourceConfiguration.reason,
        };
      }
      return checkSource(source, { limit, role }, timeoutMs, scrape);
    })
  );
}

export function hasNoHealthySources(results: SourceHealthResult[]): boolean {
  return results.length === 0 || !results.some((result) => result.status === 'ok');
}

async function checkSource(
  source: PublicJobSource,
  scrapeOptions: ScrapeOptions,
  timeoutMs: number,
  scrape: (source: PublicJobSource, options: ScrapeOptions) => Promise<ScrapedJob[]>
): Promise<SourceHealthResult> {
  const startedAt = Date.now();

  try {
    const jobs = await withTimeout(scrape(source, scrapeOptions), timeoutMs, source);
    return {
      source,
      status: jobs.length > 0 ? 'ok' : 'empty',
      jobsFound: jobs.length,
      durationMs: Date.now() - startedAt,
      sampleTitles: jobs.slice(0, 3).map((job) => job.title),
    };
  } catch (error) {
    return {
      source,
      status: 'failed',
      jobsFound: 0,
      durationMs: Date.now() - startedAt,
      sampleTitles: [],
      error: (error as Error).message,
    };
  }
}

async function scrapeSource(
  source: PublicJobSource,
  options: ScrapeOptions
): Promise<ScrapedJob[]> {
  const scraper: ScraperFn = getScraper(source);
  return scraper(options);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, source: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${source} health check timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
