import type { PublicJobSource, SelectableSource } from '../cli/cliTypes';
import { VALID_SOURCES } from '../cli/cliTypes';
import type { ScrapedJob, ScrapeOptions } from './types';
import { getScraper, getSourceConfiguration } from './sourceRegistry';
import type { SourceConfiguration } from './sourceRegistry';
import { logger } from '../utils/logger';
import { SourceUnavailableError } from './sourceErrors';

interface AggregateSourceDependencies {
  scrape?: (source: PublicJobSource, options: ScrapeOptions) => Promise<ScrapedJob[]>;
  configuration?: (source: PublicJobSource) => SourceConfiguration;
}

/**
 * Round-robin merge of several result lists: takes the 1st of each, then the
 * 2nd of each, and so on. Keeps variety across sources when the combined
 * result is later capped to the requested limit. Exposed for unit testing.
 */
export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const maxLen = lists.reduce((max, list) => Math.max(max, list.length), 0);
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
}

/**
 * Facade over the source registry: picks the right scraper and applies
 * shared behavior (logging + defensive limit handling). The special source
 * "all" aggregates every public source in parallel.
 */
export async function scrapeJobs(
  source: SelectableSource,
  options: ScrapeOptions
): Promise<ScrapedJob[]> {
  if (source === 'all') {
    return scrapeAllPublicSources(options);
  }

  logger.info(`Collecting jobs from source "${source}" (limit: ${options.limit})...`);
  const scraper = getScraper(source);
  const jobs = await scraper(options);
  assertSingleSourceResults(source, jobs);
  logger.info(`Collected ${jobs.length} job(s) from "${source}".`);
  return jobs.slice(0, options.limit);
}

export function assertSingleSourceResults(source: SelectableSource, jobs: ScrapedJob[]): void {
  if (source === 'all') return;

  const wrongSources = [
    ...new Set(jobs.map((job) => job.source).filter((jobSource) => jobSource !== source)),
  ];
  if (wrongSources.length > 0) {
    throw new Error(
      `Source "${source}" returned job(s) from ${wrongSources.join(
        ', '
      )}. Refusing mixed-source results.`
    );
  }
}

/**
 * Queries every public source in parallel, interleaves the results for
 * variety and caps to the requested limit. Each source fails independently
 * (a failing source contributes nothing but never aborts the aggregate), and
 * the pipeline's downstream de-duplication removes the same posting appearing
 * on more than one board.
 */
export async function scrapeAllPublicSources(
  options: ScrapeOptions,
  dependencies: AggregateSourceDependencies = {}
): Promise<ScrapedJob[]> {
  logger.info(
    `Collecting jobs from all ${VALID_SOURCES.length} public sources (limit: ${options.limit})...`
  );
  const scrape =
    dependencies.scrape ?? ((source, sourceOptions) => getScraper(source)(sourceOptions));
  const configuration = dependencies.configuration ?? getSourceConfiguration;

  const outcomes = await Promise.all(
    VALID_SOURCES.map(async (src) => {
      const sourceConfiguration = configuration(src);
      if (!sourceConfiguration.configured) {
        logger.warn(`  Source "${src}" is not configured: ${sourceConfiguration.reason}`);
        return { source: src, status: 'unconfigured' as const, jobs: [] };
      }

      try {
        const jobs = await scrape(src, options);
        logger.debug(`  ${src}: ${jobs.length} job(s)`);
        return { source: src, status: 'ok' as const, jobs };
      } catch (error) {
        logger.warn(`  Source "${src}" failed: ${(error as Error).message}`);
        return { source: src, status: 'failed' as const, jobs: [] };
      }
    })
  );

  const successful = outcomes.filter((outcome) => outcome.status === 'ok');
  if (successful.length === 0) {
    throw new SourceUnavailableError('all', 'All configured public job sources failed.');
  }

  const perSource = outcomes.map((outcome) => outcome.jobs);
  const merged = interleave(perSource).slice(0, options.limit);
  const contributing = perSource.filter((list) => list.length > 0).length;
  logger.info(
    `Collected ${merged.length} job(s) from ${contributing}/${successful.length} responding sources.`
  );
  return merged;
}
