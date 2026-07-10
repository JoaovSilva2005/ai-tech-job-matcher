export type Recommendation =
  'strong_apply' | 'apply' | 'study_before_applying' | 'low_priority' | 'not_recommended';

/**
 * Score bands:
 *   85-100 strong_apply | 70-84 apply | 50-69 study_before_applying
 *   30-49 low_priority  | 0-29 not_recommended
 */
export function getRecommendation(score: number): Recommendation {
  if (score >= 85) return 'strong_apply';
  if (score >= 70) return 'apply';
  if (score >= 50) return 'study_before_applying';
  if (score >= 30) return 'low_priority';
  return 'not_recommended';
}

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong_apply: 'Strong Apply',
  apply: 'Apply',
  study_before_applying: 'Study Before Applying',
  low_priority: 'Low Priority',
  not_recommended: 'Not Recommended',
};
