import type { JobMatchResult } from '../matcher/calculateMatchScore';
import type { ResumeAnalysis } from '../resume/resumeSchema';
import type { TechRole } from '../scraper/types';

export interface SkillInsight {
  skill: string;
  mentions: number;
  relatedRole: TechRole | 'multiple';
}

export interface ExecutionSummary {
  executedAt: string;
  resumeFile: string;
  role: TechRole;
  source: string;
  aiProvider: string;
  usedFallback: boolean;
  jobsCollected: number;
  jobsValid: number;
  jobsNeedingReview: number;
  jobsInvalid: number;
  duplicatesRemoved: number;
  jobsAfterRoleFilter: number;
  durationMs: number;
}

export interface ReportData {
  matches: JobMatchResult[];
  resume: ResumeAnalysis;
  summary: ExecutionSummary;
  skillInsights: SkillInsight[];
}
