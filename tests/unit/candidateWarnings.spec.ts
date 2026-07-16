import { expect, test } from '@playwright/test';
import { detectSeniorityMismatch } from '../../src/matcher/candidateWarnings';

test.describe('candidate compatibility warnings', () => {
  test('flags a one-level seniority gap without treating it as source QA', () => {
    expect(detectSeniorityMismatch('mid', 'junior')).toMatchObject({
      field: 'seniority',
      severity: 'low',
    });
  });

  test('raises the warning severity for a gap of two or more levels', () => {
    expect(detectSeniorityMismatch('senior', 'junior')).toMatchObject({
      field: 'seniority',
      severity: 'medium',
    });
  });

  test('does not warn for compatible or unknown seniority', () => {
    expect(detectSeniorityMismatch('junior', 'junior')).toBeNull();
    expect(detectSeniorityMismatch('intern', 'junior')).toBeNull();
    expect(detectSeniorityMismatch('unknown', 'junior')).toBeNull();
    expect(detectSeniorityMismatch('senior', 'unknown')).toBeNull();
  });
});
