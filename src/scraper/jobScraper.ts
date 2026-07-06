import type { SelectableSource } from '../cli/cliTypes';
import { VALID_SOURCES } from '../cli/cliTypes';
import type { ScrapedJob, ScrapeOptions } from './types';
import { getScraper } from './sourceRegistry';
import { logger } from '../utils/logger';

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
  logger.info(`Collected ${jobs.length} job(s) from "${source}".`);
  return jobs.slice(0, options.limit);
}

/**
 * Queries every public source in parallel, interleaves the results for
 * variety and caps to the requested limit. Each source fails independently
 * (a failing source contributes nothing but never aborts the aggregate), and
 * the pipeline's downstream de-duplication removes the same posting appearing
 * on more than one board.
 */
async function scrapeAllPublicSources(options: ScrapeOptions): Promise<ScrapedJob[]> {
  logger.info(
    `Collecting jobs from all ${VALID_SOURCES.length} public sources (limit: ${options.limit})...`
  );

  const perSource = await Promise.all(
    VALID_SOURCES.map(async (src) => {
      try {
        const jobs = await getScraper(src)(options);
        logger.debug(`  ${src}: ${jobs.length} job(s)`);
        return jobs;
      } catch (error) {
        logger.warn(`  Source "${src}" failed: ${(error as Error).message}`);
        return [];
      }
    })
  );

  const merged = interleave(perSource).slice(0, options.limit);
  const contributing = perSource.filter((list) => list.length > 0).length;
  logger.info(
    `Collected ${merged.length} job(s) from ${contributing}/${VALID_SOURCES.length} sources.`
  );
  return merged;
}
