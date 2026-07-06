import type { TechRole } from '../scraper/types';

export type JobSource = 'sample' | 'remoteok' | 'remotive' | 'generic';

export interface CliOptions {
  resume: string;
  role: TechRole;
  source: JobSource;
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

export const VALID_SOURCES: JobSource[] = ['sample', 'remoteok', 'remotive', 'generic'];
