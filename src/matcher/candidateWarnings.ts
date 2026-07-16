import type { SeniorityLevel } from '../scraper/types';

export interface CandidateWarning {
  field: 'seniority';
  severity: 'low' | 'medium';
  message: string;
}

const SENIORITY_ORDER: Record<SeniorityLevel, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  unknown: 1.5,
};

/**
 * Compares the candidate profile with a vacancy requirement. These warnings
 * describe compatibility, not the intrinsic quality or validity of the job data.
 */
export function detectSeniorityMismatch(
  jobSeniority: SeniorityLevel,
  resumeSeniority: SeniorityLevel
): CandidateWarning | null {
  if (jobSeniority === 'unknown' || resumeSeniority === 'unknown') return null;

  const gap = SENIORITY_ORDER[jobSeniority] - SENIORITY_ORDER[resumeSeniority];
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
