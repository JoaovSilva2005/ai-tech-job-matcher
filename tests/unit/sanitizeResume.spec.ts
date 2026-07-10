import { expect, test } from '@playwright/test';
import { sanitizeResumeText } from '../../src/resume/sanitizeResume';

test.describe('sanitizeResumeText', () => {
  test('redacts a likely name header and common direct identifiers', () => {
    const resume = `
João Vitor da Silva
Junior QA Analyst
Email: joao.qa@example.com
Phone: +55 (19) 91234-5678
CPF: 123.456.789-00
LinkedIn: https://linkedin.com/in/joaovsilva
GitHub: https://github.com/joaovsilva
Portfolio: https://joaovsilva.dev/projects
Endereço: Rua das Flores, 123, Campinas, SP
Skills: Playwright, TypeScript and API Testing.
`;

    const sanitized = sanitizeResumeText(resume);

    for (const privateValue of [
      'João Vitor da Silva',
      'joao.qa@example.com',
      '91234-5678',
      '123.456.789-00',
      'linkedin.com/in/joaovsilva',
      'github.com/joaovsilva',
      'joaovsilva.dev',
      'Rua das Flores',
    ]) {
      expect(sanitized).not.toContain(privateValue);
    }
    expect(sanitized).toContain('[name-redacted]');
    expect(sanitized).toContain('Junior QA Analyst');
    expect(sanitized).toContain('Playwright');
  });

  test('does not mistake a professional headline for a name', () => {
    const text = 'Junior QA Analyst\nPlaywright, TypeScript, Git and API Testing.';
    expect(sanitizeResumeText(text)).toContain('Junior QA Analyst');
  });

  test('is idempotent', () => {
    const once = sanitizeResumeText('Maria Oliveira\nmaria@example.com\nQA with Playwright.');
    expect(sanitizeResumeText(once)).toBe(once);
  });
});
