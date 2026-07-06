import { CliOptions, SelectableSource, SELECTABLE_SOURCES, VALID_ROLES } from './cliTypes';
import type { TechRole } from '../scraper/types';
import { SUPPORTED_RESUME_EXTENSIONS } from '../resume/parseResume';

const USAGE = `
AI Tech Job Matcher

Usage:
  npm run dev -- --resume <path> [--role <role>] [--source <source>] [--limit <n>] [--output <dir>] [--fallback] [--debug]

Options:
  --resume    Path to the resume file (${SUPPORTED_RESUME_EXTENSIONS.join(', ')})   [required]
  --role      Target role: ${VALID_ROLES.join(' | ')}          [default: all]
  --source    Job source: ${SELECTABLE_SOURCES.join(' | ')}    [default: themuse; "all" queries every source]
  --limit     Max number of jobs to collect                    [default: 16]
  --output    Output directory                                 [default: ./output]
  --fallback  Force local keyword analysis (no AI API calls)
  --debug     Verbose logging
`;

export class CliError extends Error {}

export function printUsage(): void {
  console.log(USAGE);
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    resume: '',
    role: 'all',
    source: 'themuse',
    limit: 16,
    output: './output',
    fallback: false,
    debug: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--resume':
        options.resume = argv[++i] ?? '';
        break;
      case '--role': {
        const role = (argv[++i] ?? '').toLowerCase() as TechRole;
        if (!VALID_ROLES.includes(role)) {
          throw new CliError(`Invalid --role "${role}". Valid roles: ${VALID_ROLES.join(', ')}`);
        }
        options.role = role;
        break;
      }
      case '--source': {
        const source = (argv[++i] ?? '').toLowerCase() as SelectableSource;
        if (!SELECTABLE_SOURCES.includes(source as (typeof SELECTABLE_SOURCES)[number])) {
          throw new CliError(
            `Invalid --source "${source}". Valid sources: ${SELECTABLE_SOURCES.join(', ')}`
          );
        }
        options.source = source;
        break;
      }
      case '--limit': {
        const limit = Number(argv[++i]);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          throw new CliError('--limit must be an integer between 1 and 100');
        }
        options.limit = limit;
        break;
      }
      case '--output':
        options.output = argv[++i] ?? './output';
        break;
      case '--fallback':
        options.fallback = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        throw new CliError(`Unknown argument "${arg}". Use --help to see valid options.`);
    }
  }

  if (!options.resume) {
    throw new CliError('--resume is required. Example: --resume ./samples/sample-resume.txt');
  }

  return options;
}
