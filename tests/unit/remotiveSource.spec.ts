import { expect, test } from '@playwright/test';
import { jobMatchesRole } from '../../src/scraper/sources/remotiveScraper';
import { stripHtml } from '../../src/utils/text';

test.describe('jobMatchesRole (Remotive client-side filter)', () => {
  test('keeps jobs whose classified role matches the requested role', () => {
    expect(jobMatchesRole('qa', 'QA Automation Engineer', 'Playwright and Cypress testing')).toBe(
      true
    );
    expect(jobMatchesRole('frontend', 'React Developer', 'Build UIs with React and CSS')).toBe(true);
    expect(jobMatchesRole('data', 'Data Analyst', 'Power BI dashboards and SQL analytics')).toBe(
      true
    );
  });

  test('drops jobs whose classified role differs from the requested role', () => {
    expect(jobMatchesRole('qa', 'Copywriter', 'Write marketing content and blog posts')).toBe(false);
    expect(jobMatchesRole('frontend', 'Sales Assistant', 'Handle sales calls and CRM')).toBe(false);
  });

  test('keeps everything for all/internship/unknown (pipeline filters precisely)', () => {
    expect(jobMatchesRole('all', 'Anything', 'any description')).toBe(true);
    expect(jobMatchesRole('internship', 'Copywriter', 'marketing content')).toBe(true);
    expect(jobMatchesRole(undefined, 'Copywriter', 'marketing content')).toBe(true);
  });
});

test.describe('stripHtml', () => {
  test('removes tags and decodes common entities', () => {
    const html = '<p>We use <strong>Playwright</strong> &amp; TypeScript.</p><br/>Apply now &#39;today&#39;';
    const result = stripHtml(html);
    expect(result).toContain('Playwright');
    expect(result).toContain('& TypeScript');
    expect(result).not.toContain('<');
    expect(result).not.toContain('&amp;');
  });

  test('converts list items into readable bullets', () => {
    const html = '<ul><li>JavaScript</li><li>Git</li></ul>';
    const result = stripHtml(html);
    expect(result).toContain('JavaScript');
    expect(result).toContain('Git');
  });
});
