import fs from 'fs';
import os from 'os';
import path from 'path';
import { expect, test } from '@playwright/test';
import { MAX_RESUME_CHARACTERS, parseResume, ResumeParseError } from '../../src/resume/parseResume';

test.describe('parseResume input limits', () => {
  test('distinguishes Markdown from plain text', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-format-'));
    const markdownPath = path.join(root, 'resume.md');
    fs.writeFileSync(markdownPath, '# QA Analyst\n\nPlaywright, TypeScript, Git and API Testing.');

    try {
      const parsed = await parseResume(markdownPath);
      expect(parsed.format).toBe('md');
      expect(parsed.text).toContain('Playwright');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects extracted resume text above the safety limit', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-limit-'));
    const resumePath = path.join(root, 'resume.txt');
    fs.writeFileSync(resumePath, 'a'.repeat(MAX_RESUME_CHARACTERS + 1));

    try {
      await expect(parseResume(resumePath)).rejects.toThrow(ResumeParseError);
      await expect(parseResume(resumePath)).rejects.toThrow('too large to analyze');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
