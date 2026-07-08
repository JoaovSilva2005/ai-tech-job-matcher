import { checkPublicSources, hasBlockingSourceFailure } from '../scraper/sourceHealth';
import type { SourceHealthResult } from '../scraper/sourceHealth';
import { logger } from '../utils/logger';

async function main(): Promise<void> {
  logger.info('Checking public job sources...');
  const results = await checkPublicSources();

  printResults(results);

  if (hasBlockingSourceFailure(results)) {
    process.exitCode = 1;
  }
}

function printResults(results: SourceHealthResult[]): void {
  const sourceWidth = Math.max(...results.map((result) => result.source.length), 'source'.length);
  const statusWidth = Math.max(...results.map((result) => result.status.length), 'status'.length);

  console.log('');
  console.log(
    `${pad('source', sourceWidth)}  ${pad('status', statusWidth)}  jobs  ms     sample`
  );
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

  const ok = results.filter((result) => result.status === 'ok').length;
  const empty = results.filter((result) => result.status === 'empty').length;
  const failed = results.filter((result) => result.status === 'failed').length;

  console.log('');
  console.log(`Summary: ${ok} ok, ${empty} empty, ${failed} failed.`);
}

function pad(value: string, length: number): string {
  return value.padEnd(length, ' ');
}

void main().catch((error) => {
  logger.error((error as Error).message);
  process.exitCode = 1;
});
