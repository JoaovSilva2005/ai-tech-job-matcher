import type { JobValidationResult, ScrapedJob } from './types';
import { detectJobIssues } from '../qa/detectJobIssues';
import { calculateDataQualityScore } from '../qa/dataQualityScore';

/**
 * QA gate for scraped data: every job goes through the validation rules
 * before it is analyzed and reported.
 *
 * - any HIGH severity issue    -> status "invalid"
 * - any MEDIUM severity issue  -> status "needs_review"
 * - only LOW issues (or none)  -> status "valid"
 */
export function validateJob(job: ScrapedJob): JobValidationResult {
  const issues = detectJobIssues(job);
  const dataQualityScore = calculateDataQualityScore(issues);

  const hasHigh = issues.some((issue) => issue.severity === 'high');
  const hasMedium = issues.some((issue) => issue.severity === 'medium');

  const status: JobValidationResult['status'] = hasHigh
    ? 'invalid'
    : hasMedium
      ? 'needs_review'
      : 'valid';

  return {
    isValid: !hasHigh,
    dataQualityScore,
    status,
    issues,
  };
}
