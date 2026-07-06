import { expect, test } from '@playwright/test';
import { normalizeSkill, normalizeSkills } from '../../src/matcher/normalizeSkills';

test.describe('normalizeSkills', () => {
  test('maps common aliases to canonical names', () => {
    expect(normalizeSkill('nodejs')).toBe('Node.js');
    expect(normalizeSkill('NODE')).toBe('Node.js');
    expect(normalizeSkill('js')).toBe('JavaScript');
    expect(normalizeSkill('ts')).toBe('TypeScript');
    expect(normalizeSkill('reactjs')).toBe('React');
    expect(normalizeSkill('k8s')).toBe('Kubernetes');
    expect(normalizeSkill('selenium webdriver')).toBe('Selenium');
  });

  test('is case-insensitive', () => {
    expect(normalizeSkill('PLAYWRIGHT')).toBe('Playwright');
    expect(normalizeSkill('playwright')).toBe('Playwright');
  });

  test('title-cases unknown skills instead of dropping them', () => {
    expect(normalizeSkill('rust')).toBe('Rust');
    expect(normalizeSkill('apache kafka')).toBe('Apache Kafka');
  });

  test('deduplicates aliases pointing to the same canonical skill', () => {
    const result = normalizeSkills(['node', 'Node.js', 'NODEJS', 'react', 'React.js']);
    expect(result).toEqual(['Node.js', 'React']);
  });

  test('ignores empty and whitespace-only entries', () => {
    expect(normalizeSkills(['', '  ', 'git'])).toEqual(['Git']);
  });
});
