import type { JobIssue, ScrapedJob } from '../scraper/types';
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
