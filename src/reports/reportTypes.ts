import type { JobMatchResult } from '../matcher/calculateMatchScore';
import type { ResumeAnalysis } from '../resume/resumeSchema';
import type { JobIssue, JobValidationResult } from '../scraper/types';
import type { TechRole } from '../scraper/types';
import type { WorkModeFilter } from '../cli/cliTypes';

export interface SkillInsight {
  skill: string;
  mentions: number;
  relatedRole: TechRole | 'multiple';
}

export interface ExecutionSummary {
  executedAt: string;
  resumeFormat: 'txt' | 'md' | 'pdf' | 'docx';
  resumeCharacterCount: number;
  role: TechRole;
  source: string;
  workMode: WorkModeFilter;
  userLocation?: string;
  aiProvider: string;
  usedFallback: boolean;
  jobsCollected: number;
  jobsValid: number;
  jobsNeedingReview: number;
  jobsInvalid: number;
  duplicatesRemoved: number;
  jobsAfterRoleFilter: number;
  jobsAfterWorkModeFilter: number;
  durationMs: number;
}

export interface ReportData {
  matches: JobMatchResult[];
  resume: ResumeAnalysis;
  summary: ExecutionSummary;
  skillInsights: SkillInsight[];
  qaIssues: QaIssueReportRow[];
}

export interface QaIssueReportRow extends JobIssue {
  jobId: string;
  jobTitle: string;
  company: string;
  dataQualityScore: number;
  status: JobValidationResult['status'];
  includedInRanking: boolean;
}
