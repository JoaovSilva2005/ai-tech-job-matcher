import type { JobIssue } from '../scraper/types';

const SEVERITY_PENALTY: Record<JobIssue['severity'], number> = {
  high: 30,
  medium: 15,
  low: 5,
};

/**
 * Data quality starts at 100 and each issue subtracts a penalty
 * proportional to its severity. The score is clamped to 0..100.
 */
export function calculateDataQualityScore(issues: JobIssue[]): number {
  const penalty = issues.reduce((sum, issue) => sum + SEVERITY_PENALTY[issue.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}
