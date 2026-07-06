export type TechRole =
  | 'qa'
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'data'
  | 'devops'
  | 'support'
  | 'internship'
  | 'all'
  | 'unknown';

export type WorkMode = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export type SeniorityLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'unknown';

export type EnglishLevel = 'basic' | 'intermediate' | 'advanced' | 'fluent' | 'unknown';

export interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  workMode: WorkMode;
  url: string;
  description: string;
  source: string;
  scrapedAt: string;
  rawText?: string;
}

export interface JobIssue {
  field: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface JobValidationResult {
  isValid: boolean;
  dataQualityScore: number;
  status: 'valid' | 'needs_review' | 'invalid';
  issues: JobIssue[];
}

export interface ScrapeOptions {
  limit: number;
  debug?: boolean;
  /**
   * Requested target role. Sources that support server-side category
   * filtering (e.g. Remotive) use it as a hint to fetch more relevant
   * jobs; sources that don't simply ignore it.
   */
  role?: TechRole;
}

export type ScraperFn = (options: ScrapeOptions) => Promise<ScrapedJob[]>;
