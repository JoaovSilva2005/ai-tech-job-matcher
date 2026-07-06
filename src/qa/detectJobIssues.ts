import type { JobIssue, ScrapedJob, SeniorityLevel } from '../scraper/types';
import { validationRules } from './validationRules';

/** Runs every validation rule against a job and collects the issues. */
export function detectJobIssues(job: ScrapedJob): JobIssue[] {
  const issues: JobIssue[] = [];
  for (const rule of validationRules) {
    const issue = rule(job);
    if (issue) issues.push(issue);
  }
  return issues;
}

const SENIORITY_ORDER: Record<SeniorityLevel, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  unknown: 1.5,
};

/**
 * Cross-check between the candidate profile and the job requirement:
 * a job demanding seniority above the candidate's level generates a warning
 * issue (it is not invalid — just worth flagging in the QA Issues sheet).
 */
export function detectSeniorityMismatch(
  jobSeniority: SeniorityLevel,
  resumeSeniority: SeniorityLevel
): JobIssue | null {
  const gap = SENIORITY_ORDER[jobSeniority] - SENIORITY_ORDER[resumeSeniority];
  if (jobSeniority === 'unknown' || resumeSeniority === 'unknown') return null;
  if (gap >= 2) {
    return {
      field: 'seniority',
      severity: 'medium',
      message: `Job requires "${jobSeniority}" level but candidate profile suggests "${resumeSeniority}"`,
    };
  }
  if (gap === 1) {
    return {
      field: 'seniority',
      severity: 'low',
      message: `Job seniority ("${jobSeniority}") is one level above candidate profile ("${resumeSeniority}")`,
    };
  }
  return null;
}
