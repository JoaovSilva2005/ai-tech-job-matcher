import { expect, test } from '@playwright/test';
import { validateJob } from '../../src/scraper/validateJob';
import type { ScrapedJob } from '../../src/scraper/types';

function makeJob(overrides: Partial<ScrapedJob> = {}): ScrapedJob {
  return {
    id: 'job-1',
    title: 'QA Junior Engineer',
    company: 'Acme',
    workMode: 'remote',
    url: 'https://jobs.example.com/acme/qa-junior',
    description:
      'Full QA junior position description with enough characters to satisfy the minimum length ' +
      'validation rule. You will write test cases, automate flows with Playwright and report bugs ' +
      'with clear evidence in an agile team environment.',
    source: 'test',
    scrapedAt: new Date().toISOString(),
    ...overrides,
  };
}

test.describe('validateJob', () => {
  test('a complete job is valid with a perfect data quality score', () => {
    const result = validateJob(makeJob());
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('valid');
    expect(result.dataQualityScore).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  test('empty title generates a high severity QA issue and invalidates the job', () => {
    const result = validateJob(makeJob({ title: '' }));
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('invalid');
    const titleIssue = result.issues.find((i) => i.field === 'title');
    expect(titleIssue).toBeDefined();
    expect(titleIssue!.severity).toBe('high');
  });

  test('empty company generates a high severity issue', () => {
    const result = validateJob(makeJob({ company: '  ' }));
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.field === 'company' && i.severity === 'high')).toBe(true);
  });

  test('invalid URL generates a high severity issue', () => {
    const result = validateJob(makeJob({ url: 'not-a-url' }));
    expect(result.isValid).toBe(false);
    expect(result.issues.some((i) => i.field === 'url' && i.severity === 'high')).toBe(true);
  });

  test('description under 100 characters marks the job for review', () => {
    const result = validateJob(makeJob({ description: 'Too short.' }));
    expect(result.status).toBe('needs_review');
    expect(result.issues.some((i) => i.field === 'description' && i.severity === 'medium')).toBe(
      true
    );
  });

  test('generic short description generates a low severity issue', () => {
    const description = 'x'.repeat(120); // >= 100 but below the generic threshold
    const result = validateJob(makeJob({ description }));
    expect(result.status).toBe('valid');
    expect(result.issues.some((i) => i.field === 'description' && i.severity === 'low')).toBe(true);
    expect(result.dataQualityScore).toBeLessThan(100);
  });

  test('unknown work mode generates a low severity issue', () => {
    const result = validateJob(makeJob({ workMode: 'unknown' }));
    expect(result.issues.some((i) => i.field === 'workMode' && i.severity === 'low')).toBe(true);
  });

  test('data quality score decreases as issues accumulate', () => {
    const clean = validateJob(makeJob());
    const dirty = validateJob(makeJob({ title: '', url: 'bad', workMode: 'unknown' }));
    expect(dirty.dataQualityScore).toBeLessThan(clean.dataQualityScore);
    expect(dirty.dataQualityScore).toBeGreaterThanOrEqual(0);
  });
});
