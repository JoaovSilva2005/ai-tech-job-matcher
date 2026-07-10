import { expect, test } from '@playwright/test';
import { classifyRole, isLikelyTechJobTitle } from '../../src/matcher/classifyRole';

test.describe('classifyRole', () => {
  test('classifies QA jobs by testing keywords', () => {
    expect(classifyRole('QA Junior Engineer', 'Write tests with Playwright and Cypress')).toBe(
      'qa'
    );
    expect(classifyRole('Test Automation Analyst', 'Selenium and quality assurance')).toBe('qa');
    expect(classifyRole('Manual Tester', 'Execute test cases and report bugs')).toBe('qa');
  });

  test('classifies frontend jobs', () => {
    expect(classifyRole('Frontend Developer', 'React, HTML and CSS interfaces')).toBe('frontend');
    expect(classifyRole('UI Developer', 'Angular and Vue applications with CSS')).toBe('frontend');
  });

  test('classifies backend jobs', () => {
    expect(classifyRole('Backend Developer', 'Node.js REST APIs with SQL databases')).toBe(
      'backend'
    );
    expect(classifyRole('Java Developer', 'Spring microservices and SQL')).toBe('backend');
  });

  test('classifies full stack when both frontend and backend appear', () => {
    expect(classifyRole('Full Stack Developer', 'React frontend and Node.js backend')).toBe(
      'fullstack'
    );
    expect(
      classifyRole(
        'Software Engineer',
        'You will build the react frontend and the node.js backend with sql'
      )
    ).toBe('fullstack');
  });

  test('classifies mobile, data, devops and support jobs', () => {
    expect(classifyRole('Mobile Developer', 'React Native apps for Android and iOS')).toBe(
      'mobile'
    );
    expect(classifyRole('Data Analyst', 'Power BI dashboards and data analysis')).toBe('data');
    expect(classifyRole('DevOps Engineer', 'Docker, Kubernetes and CI/CD on AWS')).toBe('devops');
    expect(classifyRole('Help Desk Analyst', 'Service desk tickets and troubleshooting')).toBe(
      'support'
    );
  });

  test('classifies internships without tech signals as internship', () => {
    expect(classifyRole('Summer Intern', 'Internship program for students')).toBe('internship');
  });

  test('returns unknown when no signal is present', () => {
    expect(classifyRole('Office Assistant', 'Organize paperwork and answer phones')).toBe(
      'unknown'
    );
  });

  test('recognizes technical titles without trusting commercial descriptions', () => {
    for (const title of [
      'Senior AI Engineer',
      'IT/AV Support Coordinator',
      'Frontend Developer',
      'Java Developer',
      'QA Automation Analyst',
      'Software Test Engineer',
      'Analista de Sistemas',
    ]) {
      expect(isLikelyTechJobTitle(title)).toBe(true);
    }
    for (const title of [
      'Account Executive, AI Sales',
      'Dispatch Coordinator',
      'Freelance Copywriter',
      'Infrastructure Projects Coordinator',
    ]) {
      expect(isLikelyTechJobTitle(title)).toBe(false);
    }
  });
});
