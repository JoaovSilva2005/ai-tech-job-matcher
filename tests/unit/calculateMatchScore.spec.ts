import { expect, test } from '@playwright/test';
import { calculateMatchScore } from '../../src/matcher/calculateMatchScore';
import { getRecommendation } from '../../src/matcher/recommendation';
import type { ResumeAnalysis } from '../../src/resume/resumeSchema';
import type { JobAnalysis } from '../../src/ai/schemas';
import type { ScrapedJob } from '../../src/scraper/types';

const juniorQaResume: ResumeAnalysis = {
  detectedSeniority: 'junior',
  targetRoles: ['qa', 'frontend'],
  technicalSkills: ['JavaScript', 'TypeScript', 'Git', 'SQL'],
  qaSkills: ['Test Case', 'Bug Report', 'Playwright'],
  developmentSkills: ['React', 'Node.js'],
  dataSkills: [],
  devopsSkills: [],
  supportSkills: [],
  tools: ['Git', 'GitHub', 'Postman'],
  languages: [{ language: 'English', level: 'advanced' }],
  strengths: ['QA mindset'],
  improvementAreas: [],
  summary: 'Junior QA-oriented candidate',
  fallbackMode: true,
};

function makeJob(overrides: Partial<ScrapedJob> = {}): ScrapedJob {
  return {
    id: 'job-1',
    title: 'QA Junior Engineer',
    company: 'Acme',
    workMode: 'remote',
    url: 'https://jobs.example.com/acme/qa-junior',
    description:
      'QA junior position working with Playwright, TypeScript, Git and test cases. English required.',
    source: 'test',
    scrapedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<JobAnalysis> = {}): JobAnalysis {
  return {
    normalizedTitle: 'QA Junior Engineer',
    role: 'qa',
    seniorityLevel: 'junior',
    requiredSkills: ['JavaScript', 'Git', 'Test Case'],
    niceToHaveSkills: ['Playwright'],
    tools: ['Git'],
    programmingLanguages: ['JavaScript'],
    frameworks: [],
    automationTools: ['Playwright'],
    apiTools: [],
    englishRequired: true,
    englishLevel: 'intermediate',
    testingRequired: true,
    apiTestingRequired: false,
    automationRequired: true,
    juniorFriendly: true,
    summary: 'Junior QA role',
    redFlags: [],
    recommendedStudyTopics: ['API Testing'],
    fallbackMode: true,
    ...overrides,
  };
}

test.describe('calculateMatchScore', () => {
  test('score is always between 0 and 100', () => {
    const good = calculateMatchScore(juniorQaResume, makeJob(), makeAnalysis());
    expect(good.score).toBeGreaterThanOrEqual(0);
    expect(good.score).toBeLessThanOrEqual(100);
  });

  test('well-aligned junior QA job scores high with apply recommendation', () => {
    const result = calculateMatchScore(juniorQaResume, makeJob(), makeAnalysis());
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(['strong_apply', 'apply']).toContain(result.recommendation);
    expect(result.matchedSkills).toContain('JavaScript');
    expect(result.matchedSkills).toContain('Playwright');
  });

  test('senior job penalizes a junior profile', () => {
    const juniorResult = calculateMatchScore(juniorQaResume, makeJob(), makeAnalysis());
    const seniorResult = calculateMatchScore(
      juniorQaResume,
      makeJob({ title: 'Senior QA Engineer' }),
      makeAnalysis({
        seniorityLevel: 'senior',
        requiredSkills: ['Java', 'Selenium', 'Kubernetes', 'Docker'],
      })
    );
    expect(seniorResult.score).toBeLessThan(juniorResult.score);
    expect(seniorResult.score).toBeLessThan(50);
    expect(seniorResult.candidateWarnings).toEqual([
      expect.objectContaining({ field: 'seniority', severity: 'medium' }),
    ]);
    expect(seniorResult.validation.issues).toEqual([]);
  });

  test('missing critical required skills appear as critical gaps', () => {
    const result = calculateMatchScore(
      juniorQaResume,
      makeJob(),
      makeAnalysis({ requiredSkills: ['Cypress', 'Java'] })
    );
    expect(result.criticalGaps).toContain('Cypress');
    expect(result.criticalGaps).toContain('Java');
    expect(result.studyPlan.length).toBeGreaterThan(0);
  });

  test('explanation mentions matched skills for strong matches', () => {
    const result = calculateMatchScore(juniorQaResume, makeJob(), makeAnalysis());
    expect(result.explanation.length).toBeGreaterThan(20);
    expect(result.explanation).toMatch(/match/i);
  });

  test('recommendation bands follow the score thresholds', () => {
    expect(getRecommendation(90)).toBe('strong_apply');
    expect(getRecommendation(85)).toBe('strong_apply');
    expect(getRecommendation(84)).toBe('apply');
    expect(getRecommendation(70)).toBe('apply');
    expect(getRecommendation(69)).toBe('study_before_applying');
    expect(getRecommendation(50)).toBe('study_before_applying');
    expect(getRecommendation(49)).toBe('low_priority');
    expect(getRecommendation(30)).toBe('low_priority');
    expect(getRecommendation(29)).toBe('not_recommended');
    expect(getRecommendation(0)).toBe('not_recommended');
  });
});
