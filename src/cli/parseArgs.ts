import { SELECTABLE_SOURCES, VALID_ROLES, VALID_WORK_MODES } from './cliTypes';
import type { CliOptions, ManualJobInput, SelectableSource, WorkModeFilter } from './cliTypes';
import type { TechRole, WorkMode } from '../scraper/types';
import { SUPPORTED_RESUME_EXTENSIONS } from '../resume/parseResume';
import fs from 'fs';

const USAGE = `
AI Tech Job Matcher

Usage:
  npm run dev -- -- --resume <path> [--role <role>] [--source <source>] [--work-mode <mode>] [--location <city>] [--job-file <path>] [--limit <n>] [--output <dir>] [--fallback] [--debug]

Options:
  --resume    Path to the resume file (${SUPPORTED_RESUME_EXTENSIONS.join(', ')})   [required]
  --role      Target role: ${VALID_ROLES.join(' | ')}          [default: all]
  --source    Job source: ${SELECTABLE_SOURCES.join(' | ')}    [default: gupy; "all" queries every source]
  --work-mode Work mode: ${VALID_WORK_MODES.join(' | ')}       [default: all]
  --location  Candidate city/address used to prioritize nearby jobs
  --job-file  Analyze one specific job description instead of collecting jobs
  --job-desc  Specific job description text (alternative to --job-file)
  --job-title Specific job title                            [default: Specific Job]
  --job-company Specific job company                        [default: Company not provided]
  --job-url   Original application URL for the specific job
  --limit     Max number of jobs to collect                    [default: 16]
  --output    Output directory                                 [default: ./output]
  --fallback  Force local keyword analysis (no AI API calls)
  --debug     Verbose logging
`;

export class CliError extends Error {}

const DEFAULT_MANUAL_JOB_URL = 'https://example.com/manual-job';

export function printUsage(): void {
  console.log(USAGE);
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    resume: '',
    role: 'all',
    source: 'gupy',
    workMode: 'all',
    userLocation: '',
    limit: 16,
    output: './output',
    fallback: false,
    debug: false,
  };
  const manualJob: Partial<ManualJobInput> = {};

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
      case '--work-mode': {
        const workMode = (argv[++i] ?? '').toLowerCase() as WorkModeFilter;
        if (!VALID_WORK_MODES.includes(workMode)) {
          throw new CliError(
            `Invalid --work-mode "${workMode}". Valid work modes: ${VALID_WORK_MODES.join(', ')}`
          );
        }
        options.workMode = workMode;
        break;
      }
      case '--location':
      case '--user-location':
        options.userLocation = argv[++i] ?? '';
        break;
      case '--job-file': {
        const filePath = argv[++i] ?? '';
        if (!filePath || !fs.existsSync(filePath)) {
          throw new CliError(`--job-file not found: ${filePath}`);
        }
        manualJob.description = fs.readFileSync(filePath, 'utf-8');
        break;
      }
      case '--job-desc':
      case '--job-description':
        manualJob.description = argv[++i] ?? '';
        break;
      case '--job-title':
        manualJob.title = argv[++i] ?? '';
        break;
      case '--job-company':
        manualJob.company = argv[++i] ?? '';
        break;
      case '--job-url':
        manualJob.url = argv[++i] ?? '';
        break;
      case '--job-location':
        manualJob.location = argv[++i] ?? '';
        break;
      case '--job-work-mode': {
        const workMode = (argv[++i] ?? '').toLowerCase() as WorkMode;
        if (!['remote', 'hybrid', 'onsite', 'unknown'].includes(workMode)) {
          throw new CliError('--job-work-mode must be remote, hybrid, onsite, or unknown');
        }
        manualJob.workMode = workMode;
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

  if (manualJob.description?.trim()) {
    options.manualJob = {
      title: manualJob.title?.trim() || 'Specific Job',
      company: manualJob.company?.trim() || 'Company not provided',
      url: manualJob.url?.trim() || DEFAULT_MANUAL_JOB_URL,
      location: manualJob.location?.trim() || options.userLocation.trim() || 'Not specified',
      workMode: manualJob.workMode ?? 'unknown',
      description: manualJob.description.trim(),
    };
    options.limit = 1;
  }

  return options;
}
