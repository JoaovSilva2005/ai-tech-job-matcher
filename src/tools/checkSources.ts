import path from 'path';
import { checkPublicSources, hasNoHealthySources } from '../scraper/sourceHealth';
import type { SourceHealthResult } from '../scraper/sourceHealth';
import { logger } from '../utils/logger';
import { writeJsonFile } from '../utils/fileSystem';
import { nowIso } from '../utils/date';

const HEALTH_REPORT_PATH = path.resolve('output/source-health.json');

async function main(): Promise<void> {
  logger.info('Checking public job sources...');
  const results = await checkPublicSources();

  printResults(results);
  writeJsonFile(HEALTH_REPORT_PATH, {
    checkedAt: nowIso(),
    summary: summarize(results),
    sources: results,
  });
  logger.info(`Health evidence saved to ${HEALTH_REPORT_PATH}`);

  if (hasNoHealthySources(results)) {
    process.exitCode = 1;
  }
}

function printResults(results: SourceHealthResult[]): void {
  const sourceWidth = Math.max(...results.map((result) => result.source.length), 'source'.length);
  const statusWidth = Math.max(...results.map((result) => result.status.length), 'status'.length);

  console.log('');
  console.log(`${pad('source', sourceWidth)}  ${pad('status', statusWidth)}  jobs  ms     sample`);
  console.log(
    `${'-'.repeat(sourceWidth)}  ${'-'.repeat(statusWidth)}  ----  -----  ${'-'.repeat(40)}`
  );

  for (const result of results) {
    const sample = result.sampleTitles.join(' | ') || result.error || '-';
    console.log(
      `${pad(result.source, sourceWidth)}  ${pad(result.status, statusWidth)}  ${pad(
        String(result.jobsFound),
        4
      )}  ${pad(String(result.durationMs), 5)}  ${sample}`
    );
  }

  const summary = summarize(results);

  console.log('');
  console.log(
    `Summary: ${summary.ok} ok, ${summary.empty} empty, ${summary.unconfigured} unconfigured, ${summary.failed} failed.`
  );
}

function summarize(results: SourceHealthResult[]) {
  return {
    ok: results.filter((result) => result.status === 'ok').length,
    empty: results.filter((result) => result.status === 'empty').length,
    unconfigured: results.filter((result) => result.status === 'unconfigured').length,
    failed: results.filter((result) => result.status === 'failed').length,
  };
}

function pad(value: string, length: number): string {
  return value.padEnd(length, ' ');
}

void main().catch((error) => {
  logger.error((error as Error).message);
  process.exitCode = 1;
});
