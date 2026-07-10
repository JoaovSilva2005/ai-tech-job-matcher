import type { TechRole, WorkMode } from '../scraper/types';

export type JobSource =
  'sample' | 'remoteok' | 'remotive' | 'themuse' | 'greenhouse' | 'gupy' | 'lever';

export type PublicJobSource = Exclude<JobSource, 'sample'>;

/** Pseudo-source that aggregates every public source in a single run. */
export type AggregateSource = 'all';

/** Any value the CLI/web layer accepts for --source. */
export type SelectableSource = JobSource | AggregateSource;

export type WorkModeFilter = WorkMode | 'all';

export interface ManualJobInput {
  title: string;
  company: string;
  url: string;
  location: string;
  workMode: WorkMode;
  description: string;
}

export interface CliOptions {
  resume: string;
  role: TechRole;
  source: SelectableSource;
  workMode: WorkModeFilter;
  userLocation: string;
  manualJob?: ManualJobInput;
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
  'gupy',
  'lever',
];

/** User-facing sources: every public source plus the "all" aggregate. */
export const SELECTABLE_SOURCES: (PublicJobSource | AggregateSource)[] = [...VALID_SOURCES, 'all'];

export const VALID_WORK_MODES: WorkModeFilter[] = ['all', 'remote', 'hybrid', 'onsite'];
