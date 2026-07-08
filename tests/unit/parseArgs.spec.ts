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
      'Example Co',
      '--job-url',
      'https://jobs.example.com/qa-jr',
      '--job-work-mode',
      'remote',
    ]);

    expect(options.limit).toBe(1);
    expect(options.manualJob).toEqual(
      expect.objectContaining({
        title: 'QA Jr',
        company: 'Example Co',
        url: 'https://jobs.example.com/qa-jr',
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
      'Specific QA job description with enough useful details for the analyzer.',
    ]);

    expect(options.manualJob?.title).toBe('Specific Job');
    expect(options.manualJob?.company).toBe('Company not provided');
    expect(options.manualJob?.url).toBe('https://example.com/manual-job');
  });
});
