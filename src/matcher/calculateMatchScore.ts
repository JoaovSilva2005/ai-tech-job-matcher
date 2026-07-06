import type { JobValidationResult, ScrapedJob, SeniorityLevel, TechRole } from '../scraper/types';
import type { ResumeAnalysis } from '../resume/resumeSchema';
import type { JobAnalysis } from '../ai/schemas';
import { normalizeSkills } from './normalizeSkills';
import { getRecommendation, Recommendation } from './recommendation';
import { explainMatch } from './explainMatch';
import { containsKeyword } from '../utils/text';

export interface JobMatchResult {
  job: ScrapedJob;
  analysis: JobAnalysis;
  validation: JobValidationResult;
  score: number;
  recommendation: Recommendation;
  matchedSkills: string[];
  missingSkills: string[];
  criticalGaps: string[];
  explanation: string;
  studyPlan: string[];
}

const SENIORITY_ORDER: Record<SeniorityLevel, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  unknown: 1.5,
};

const ENGLISH_ORDER: Record<string, number> = {
  unknown: 0,
  basic: 1,
  intermediate: 2,
  advanced: 3,
  fluent: 4,
};

const RELATED_ROLES: Partial<Record<TechRole, TechRole[]>> = {
  qa: ['backend', 'frontend', 'fullstack'],
  frontend: ['fullstack', 'mobile'],
  backend: ['fullstack', 'devops'],
  fullstack: ['frontend', 'backend'],
  mobile: ['frontend'],
  data: ['backend'],
  devops: ['backend'],
  support: ['qa', 'devops'],
  internship: ['qa', 'frontend', 'backend'],
};

/** Skills so central to a job that missing them is a critical gap. */
const CRITICAL_SKILL_HINTS = [
  'Playwright',
  'Cypress',
  'Selenium',
  'JavaScript',
  'TypeScript',
  'Java',
  'Python',
  'C#',
  'React',
  'Angular',
  'Vue',
  'Node.js',
  'SQL',
  'API Testing',
  'Docker',
  'Kubernetes',
  'React Native',
  'Flutter',
  'Power BI',
];

function allResumeSkills(resume: ResumeAnalysis): string[] {
  return normalizeSkills([
    ...resume.technicalSkills,
    ...resume.qaSkills,
    ...resume.developmentSkills,
    ...resume.dataSkills,
    ...resume.devopsSkills,
    ...resume.supportSkills,
    ...resume.tools,
  ]);
}

function resumeEnglishLevel(resume: ResumeAnalysis): number {
  const english = resume.languages.find((l) => l.language.toLowerCase() === 'english');
  return ENGLISH_ORDER[english?.level ?? 'unknown'] ?? 0;
}

/**
 * Hybrid scoring model (max 100 before penalties, clamped to 0..100):
 *   skills overlap ................. up to 30
 *   role compatibility ............. up to 15
 *   seniority compatibility ........ up to 20
 *   english compatibility .......... up to 10
 *   required tools overlap ......... up to 10
 *   related experience/projects .... up to 10
 *   remote/hybrid work mode ........ up to  5
 *   critical gaps penalty .......... down to -20
 *   senior job vs junior profile ... down to -25
 */
export function calculateMatchScore(
  resume: ResumeAnalysis,
  job: ScrapedJob,
  analysis: JobAnalysis,
  validation?: JobValidationResult
): JobMatchResult {
  const candidateSkills = allResumeSkills(resume);
  const candidateSkillSet = new Set(candidateSkills.map((s) => s.toLowerCase()));

  const jobSkills = normalizeSkills([...analysis.requiredSkills, ...analysis.niceToHaveSkills]);
  const requiredSkills = normalizeSkills(analysis.requiredSkills);

  const matchedSkills = jobSkills.filter((s) => candidateSkillSet.has(s.toLowerCase()));
  const missingSkills = jobSkills.filter((s) => !candidateSkillSet.has(s.toLowerCase()));
  const missingRequired = requiredSkills.filter((s) => !candidateSkillSet.has(s.toLowerCase()));

  const criticalGaps = missingRequired.filter((s) =>
    CRITICAL_SKILL_HINTS.some((hint) => hint.toLowerCase() === s.toLowerCase())
  );

  let score = 0;

  // 1. Skills overlap (up to 30): weighted by how many required skills match
  if (requiredSkills.length > 0) {
    const matchedRequired = requiredSkills.length - missingRequired.length;
    score += Math.round((matchedRequired / requiredSkills.length) * 24);
    // small bonus for nice-to-have matches
    const niceMatches = matchedSkills.length - matchedRequired;
    score += Math.min(6, Math.max(0, niceMatches) * 2);
  } else if (matchedSkills.length > 0) {
    score += Math.min(30, matchedSkills.length * 5);
  }

  // 2. Role compatibility (up to 15)
  const targetRoles: TechRole[] = resume.targetRoles.filter((r) => r !== 'unknown');
  const roleCompatible =
    targetRoles.includes(analysis.role) ||
    analysis.role === 'internship' ||
    targetRoles.includes('all');
  const roleRelated = targetRoles.some((r) => RELATED_ROLES[r]?.includes(analysis.role));
  if (roleCompatible) score += 15;
  else if (roleRelated) score += 8;

  // 3. Seniority compatibility (up to 20)
  const seniorityGap =
    SENIORITY_ORDER[analysis.seniorityLevel] - SENIORITY_ORDER[resume.detectedSeniority];
  const seniorityCompatible = Math.abs(seniorityGap) <= 0.5;
  if (analysis.seniorityLevel === 'unknown' || resume.detectedSeniority === 'unknown') {
    score += 12;
  } else if (seniorityCompatible) {
    score += 20;
  } else if (Math.abs(seniorityGap) === 1) {
    score += 12;
  } else if (seniorityGap < 0) {
    // job below candidate level: easy but not ideal
    score += 8;
  }

  // 4. English compatibility (up to 10)
  const candidateEnglish = resumeEnglishLevel(resume);
  const requiredEnglish = ENGLISH_ORDER[analysis.englishLevel] ?? 0;
  if (!analysis.englishRequired) {
    score += 10;
  } else if (candidateEnglish >= requiredEnglish) {
    score += 10;
  } else if (candidateEnglish === requiredEnglish - 1) {
    score += 5;
  }

  // 5. Required tools overlap (up to 10)
  const jobTools = normalizeSkills([...analysis.tools, ...analysis.automationTools, ...analysis.apiTools]);
  if (jobTools.length > 0) {
    const matchedTools = jobTools.filter((t) => candidateSkillSet.has(t.toLowerCase()));
    score += Math.round((matchedTools.length / jobTools.length) * 10);
  } else {
    score += 5;
  }

  // 6. Related experience/projects (up to 10): resume skills that also
  //    appear in the raw job description text
  const descriptionHits = candidateSkills.filter((skill) =>
    containsKeyword(job.description, skill)
  ).length;
  score += Math.min(10, descriptionHits * 2);

  // 7. Work mode (up to 5): remote-friendly candidates favor remote/hybrid
  if (job.workMode === 'remote' || job.workMode === 'hybrid') score += 5;
  else if (job.workMode === 'unknown') score += 3;
  else score += 2;

  // 8. Critical gaps penalty (down to -20)
  score -= Math.min(20, criticalGaps.length * 5);

  // 9. Clearly senior job vs junior/intern profile (down to -25)
  const juniorProfile = ['intern', 'junior'].includes(resume.detectedSeniority);
  if (analysis.seniorityLevel === 'senior' && juniorProfile) {
    score -= 25;
  } else if (analysis.seniorityLevel === 'mid' && resume.detectedSeniority === 'intern') {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const recommendation = getRecommendation(score);
  const explanation = explainMatch({
    score,
    matchedSkills,
    missingSkills,
    criticalGaps,
    roleCompatible,
    seniorityCompatible: seniorityGap <= 0.5,
    resume,
    analysis,
  });

  const studyPlan = normalizeSkills([
    ...criticalGaps,
    ...analysis.recommendedStudyTopics,
    ...missingRequired,
  ]).slice(0, 6);

  return {
    job,
    analysis,
    validation: validation ?? {
      isValid: true,
      dataQualityScore: 100,
      status: 'valid',
      issues: [],
    },
    score,
    recommendation,
    matchedSkills,
    missingSkills,
    criticalGaps,
    explanation,
    studyPlan,
  };
}
