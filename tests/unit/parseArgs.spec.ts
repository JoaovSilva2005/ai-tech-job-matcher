import fs from 'fs';
import path from 'path';
import { expect, test } from '@playwright/test';
import { parseArgs } from '../../src/cli/parseArgs';

const RESUME_PATH = path.resolve(__dirname, '../../samples/sample-resume.txt');
const JOB_FILE = path.resolve(__dirname, '../fixtures/sample-job-description.txt');

test.describe('parseArgs', () => {
  test('parses specific job input from a file', () => {
    const options = parseArgs([
      '--resume',
      RESUME_PATH,
      '--role',
      'qa',
      '--job-file',
      JOB_FILE,
      '--job-title',
      'QA Jr',
      '--job-company',
      'Venturus',
      '--job-url',
      'https://venturus.gupy.io/jobs/123456',
      '--job-work-mode',
      'remote',
    ]);

    expect(options.limit).toBe(1);
    expect(options.manualJob).toEqual(
      expect.objectContaining({
        title: 'QA Jr',
        company: 'Venturus',
        url: 'https://venturus.gupy.io/jobs/123456',
        workMode: 'remote',
        description: fs.readFileSync(JOB_FILE, 'utf-8').trim(),
      })
    );
  });

  test('parses specific job input from inline text', () => {
    const options = parseArgs([
      '--resume',
      RESUME_PATH,
      '--job-desc',
      'Specific junior QA job description with Playwright, API testing, manual testing, bug reports, Git and enough useful details for the analyzer.',
      '--job-title',
      'QA Jr',
      '--job-company',
      'Venturus',
      '--job-url',
      'https://venturus.gupy.io/jobs/123456',
      '--job-location',
      'Remote - Brazil',
    ]);

    expect(options.manualJob).toEqual(
      expect.objectContaining({
        title: 'QA Jr',
        company: 'Venturus',
        url: 'https://venturus.gupy.io/jobs/123456',
        location: 'Remote - Brazil',
      })
    );
  });

  test('rejects specific jobs without real identifying data', () => {
    expect(() =>
      parseArgs([
        '--resume',
        RESUME_PATH,
        '--job-desc',
        'Specific junior QA job description with Playwright, API testing, manual testing, bug reports, Git and enough useful details for the analyzer.',
      ])
    ).toThrow('--job-title is required');

    expect(() =>
      parseArgs([
        '--resume',
        RESUME_PATH,
        '--job-desc',
        'Specific junior QA job description with Playwright, API testing, manual testing, bug reports, Git and enough useful details for the analyzer.',
        '--job-title',
        'QA Jr',
        '--job-company',
        'Example Co',
        '--job-url',
        'https://example.com/job',
      ])
    ).toThrow('--job-url must be a real');
  });
});
