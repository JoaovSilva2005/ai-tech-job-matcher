import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import {
  detectEnglishLevel,
  detectSeniority,
  fallbackAnalyzeJob,
  fallbackAnalyzeResume,
} from '../../src/ai/fallbackAnalyzer';
import type { ScrapedJob } from '../../src/scraper/types';

const resumeText = fs.readFileSync(
  path.resolve(__dirname, '../fixtures/sample-resume.txt'),
  'utf-8'
);
const projectSampleResumeText = fs.readFileSync(
  path.resolve(__dirname, '../../samples/sample-resume.txt'),
  'utf-8'
);
const jobDescription = fs.readFileSync(
  path.resolve(__dirname, '../fixtures/sample-job-description.txt'),
  'utf-8'
);

test.describe('fallbackAnalyzeResume', () => {
  test('detects technical skills from the sample resume', () => {
    const analysis = fallbackAnalyzeResume(resumeText);
    expect(analysis.technicalSkills).toEqual(
      expect.arrayContaining(['JavaScript', 'TypeScript', 'Git', 'SQL', 'React', 'Node.js'])
    );
    expect(analysis.qaSkills).toEqual(expect.arrayContaining(['Playwright', 'Test Case']));
    expect(analysis.fallbackMode).toBe(true);
  });

  test('detects advanced English and QA/frontend/backend interests', () => {
    const analysis = fallbackAnalyzeResume(resumeText);
    const english = analysis.languages.find((l) => l.language === 'English');
    expect(english?.level).toBe('advanced');
    expect(analysis.targetRoles).toEqual(expect.arrayContaining(['qa', 'frontend', 'backend']));
  });

  test('produces strengths, improvement areas and a summary', () => {
    const analysis = fallbackAnalyzeResume(resumeText);
    expect(analysis.strengths.length).toBeGreaterThan(0);
    expect(analysis.summary.length).toBeGreaterThan(20);
  });

  test('detects the project sample resume as junior', () => {
    const analysis = fallbackAnalyzeResume(projectSampleResumeText);
    expect(analysis.detectedSeniority).toBe('junior');
  });
});

test.describe('fallbackAnalyzeJob', () => {
  const job: ScrapedJob = {
    id: 'fx-job',
    title: 'QA Junior Engineer (Playwright)',
    company: 'BlueOrbit Software',
    workMode: 'remote',
    url: 'https://jobs.example.com/blueorbit/qa-junior-playwright',
    description: jobDescription,
    source: 'fixture',
    scrapedAt: new Date().toISOString(),
  };

  test('classifies the job and detects automation tools', () => {
    const analysis = fallbackAnalyzeJob(job);
    expect(analysis.role).toBe('qa');
    expect(analysis.seniorityLevel).toBe('junior');
    expect(analysis.automationTools).toContain('Playwright');
    expect(analysis.testingRequired).toBe(true);
    expect(analysis.juniorFriendly).toBe(true);
    expect(analysis.fallbackMode).toBe(true);
  });

  test('detects english requirement from the description', () => {
    const analysis = fallbackAnalyzeJob(job);
    expect(analysis.englishRequired).toBe(true);
    expect(analysis.englishLevel).toBe('intermediate');
  });

  test('separates nice-to-have skills from required skills', () => {
    const analysis = fallbackAnalyzeJob(job);
    expect(analysis.requiredSkills.length).toBeGreaterThan(0);
    for (const nice of analysis.niceToHaveSkills) {
      expect(analysis.requiredSkills).not.toContain(nice);
    }
  });
});

test.describe('keyword detectors', () => {
  test('detectSeniority recognizes all levels', () => {
    expect(detectSeniority('Senior QA Engineer')).toBe('senior');
    expect(detectSeniority('Mid-level developer, pleno')).toBe('mid');
    expect(detectSeniority('Junior developer')).toBe('junior');
    expect(detectSeniority('Internship program')).toBe('intern');
    expect(detectSeniority('Software engineer')).toBe('unknown');
  });

  test('does not mistake international experience for an internship', () => {
    expect(detectSeniority('Worked daily with international teammates')).toBe('unknown');
    expect(detectSeniority('Junior developer working with international teammates')).toBe('junior');
  });

  test('detectEnglishLevel recognizes levels and absence', () => {
    expect(detectEnglishLevel('native English speaker')).toBe('native');
    expect(detectEnglishLevel('fluent english required')).toBe('fluent');
    expect(detectEnglishLevel('advanced english')).toBe('advanced');
    expect(detectEnglishLevel('intermediate english')).toBe('intermediate');
    expect(detectEnglishLevel('basic english')).toBe('basic');
    expect(detectEnglishLevel('no language mentioned')).toBe('unknown');
  });
});
