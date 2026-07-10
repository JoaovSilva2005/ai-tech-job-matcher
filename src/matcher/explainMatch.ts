import type { ResumeAnalysis } from '../resume/resumeSchema';
import type { JobAnalysis } from '../ai/schemas';

interface ExplainInput {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  criticalGaps: string[];
  roleCompatible: boolean;
  seniorityCompatible: boolean;
  resume: ResumeAnalysis;
  analysis: JobAnalysis;
}

/**
 * Builds a short recruiter-friendly explanation of why the job scored
 * the way it did, e.g.:
 * "Strong match because the candidate has TypeScript, Git and advanced
 *  English. The main gaps are hands-on Playwright experience."
 */
export function explainMatch(input: ExplainInput): string {
  const { score, matchedSkills, missingSkills, criticalGaps, analysis } = input;

  const strengthLabel =
    score >= 85
      ? 'Strong match'
      : score >= 70
        ? 'Good match'
        : score >= 50
          ? 'Partial match'
          : 'Weak match';

  const parts: string[] = [];

  if (matchedSkills.length > 0) {
    parts.push(
      `${strengthLabel} because the candidate already has ${formatList(matchedSkills.slice(0, 4))}`
    );
  } else {
    parts.push(`${strengthLabel}: few overlapping skills were found for this position`);
  }

  const englishOk =
    !analysis.englishRequired ||
    input.resume.languages.some(
      (l) =>
        l.language.toLowerCase() === 'english' && ['advanced', 'fluent', 'native'].includes(l.level)
    );
  if (analysis.englishRequired && englishOk) {
    parts.push('and meets the English requirement');
  }

  if (!input.seniorityCompatible) {
    parts.push(`. Note: the position targets ${analysis.seniorityLevel} level`);
  }

  const gaps = criticalGaps.length > 0 ? criticalGaps : missingSkills;
  if (gaps.length > 0) {
    parts.push(`. The main gaps are ${formatList(gaps.slice(0, 3))}`);
  }

  return parts.join(' ').replace(/\s+\./g, '.').trim() + '.';
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
