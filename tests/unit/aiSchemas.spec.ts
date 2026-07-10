import { expect, test } from '@playwright/test';
import { jobAnalysisSchema } from '../../src/ai/schemas';
import { resumeAnalysisSchema } from '../../src/resume/resumeSchema';
import { JOB_ANALYSIS_SYSTEM_PROMPT, RESUME_ANALYSIS_SYSTEM_PROMPT } from '../../src/ai/prompts';

const validResumeAnalysis = {
  detectedSeniority: 'junior',
  targetRoles: ['qa'],
  technicalSkills: ['TypeScript'],
  qaSkills: ['Playwright'],
  developmentSkills: [],
  dataSkills: [],
  devopsSkills: [],
  supportSkills: [],
  tools: ['Git'],
  languages: [{ language: 'English', level: 'advanced' }],
  strengths: ['Hands-on test automation experience'],
  improvementAreas: ['Performance testing practice'],
  summary: 'Junior QA candidate with practical web automation and API testing experience.',
  fallbackMode: false,
};

const validJobAnalysis = {
  normalizedTitle: 'Junior QA Analyst',
  role: 'qa',
  seniorityLevel: 'junior',
  requiredSkills: ['Playwright'],
  niceToHaveSkills: ['API Testing'],
  tools: ['Git'],
  programmingLanguages: ['TypeScript'],
  frameworks: [],
  automationTools: ['Playwright'],
  apiTools: ['REST'],
  englishRequired: true,
  englishLevel: 'advanced',
  testingRequired: true,
  apiTestingRequired: true,
  automationRequired: true,
  juniorFriendly: true,
  summary: 'Junior quality assurance role focused on web and API test automation.',
  redFlags: [],
  recommendedStudyTopics: ['API Testing'],
  fallbackMode: false,
};

test.describe('AI response schemas', () => {
  test('rejects empty or semantically empty resume analysis objects', () => {
    expect(resumeAnalysisSchema.safeParse({}).success).toBe(false);
    expect(
      resumeAnalysisSchema.safeParse({
        ...validResumeAnalysis,
        targetRoles: ['unknown'],
        technicalSkills: [],
        qaSkills: [],
        tools: [],
      }).success
    ).toBe(false);
  });

  test('rejects identity fields and empty job analysis objects', () => {
    expect(
      resumeAnalysisSchema.safeParse({ ...validResumeAnalysis, candidateName: 'Private Name' })
        .success
    ).toBe(false);
    expect(jobAnalysisSchema.safeParse({}).success).toBe(false);
    expect(
      jobAnalysisSchema.safeParse({
        ...validJobAnalysis,
        role: 'unknown',
        requiredSkills: [],
        tools: [],
        programmingLanguages: [],
      }).success
    ).toBe(false);
  });

  test('accepts complete, useful analyses', () => {
    expect(resumeAnalysisSchema.safeParse(validResumeAnalysis).success).toBe(true);
    expect(
      resumeAnalysisSchema.safeParse({
        ...validResumeAnalysis,
        languages: [{ language: 'Portuguese', level: 'native' }],
      }).success
    ).toBe(true);
    expect(jobAnalysisSchema.safeParse(validJobAnalysis).success).toBe(true);
  });

  test('prompts tell providers to ignore instructions inside untrusted content', () => {
    expect(RESUME_ANALYSIS_SYSTEM_PROMPT).toContain('untrusted data');
    expect(JOB_ANALYSIS_SYSTEM_PROMPT).toContain('untrusted data');
    expect(RESUME_ANALYSIS_SYSTEM_PROMPT).toContain("candidate's identity");
  });
});
