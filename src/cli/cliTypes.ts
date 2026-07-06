import type { TechRole } from '../scraper/types';

export type JobSource =
  | 'sample'
  | 'remoteok'
  | 'remotive'
  | 'themuse'
  | 'greenhouse'
  | 'lever';

export type PublicJobSource = Exclude<JobSource, 'sample'>;

/** Pseudo-source that aggregates every public source in a single run. */
export type AggregateSource = 'all';

/** Any value the CLI/web layer accepts for --source. */
export type SelectableSource = JobSource | AggregateSource;

export interface CliOptions {
  resume: string;
  role: TechRole;
  source: SelectableSource;
  limit: number;
  output: string;
  fallback: boolean;
  debug: boolean;
}

export const VALID_ROLES: TechRole[] = [
  'qa',
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'data',
  'devops',
  'support',
  'internship',
  'all',
];

export const VALID_SOURCES: PublicJobSource[] = [
  'remoteok',
  'remotive',
  'themuse',
  'greenhouse',
  'lever',
];

/** User-facing sources: every public source plus the "all" aggregate. */
export const SELECTABLE_SOURCES: (PublicJobSource | AggregateSource)[] = [...VALID_SOURCES, 'all'];
