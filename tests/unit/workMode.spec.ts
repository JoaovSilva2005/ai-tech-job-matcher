import { expect, test } from '@playwright/test';
import { normalizeWorkMode } from '../../src/scraper/normalizeWorkMode';

test.describe('normalizeWorkMode', () => {
  test('gives hybrid precedence when a posting mentions remote days', () => {
    expect(normalizeWorkMode('Hybrid role with two remote days per week')).toBe('hybrid');
    expect(normalizeWorkMode('Modelo híbrido, parte remoto e parte presencial')).toBe('hybrid');
  });

  test('understands explicit remote and on-site signals', () => {
    expect(normalizeWorkMode('100% remote - Brazil')).toBe('remote');
    expect(normalizeWorkMode('Trabalho presencial no escritório')).toBe('onsite');
    expect(normalizeWorkMode('No remote work; position is on-site')).toBe('onsite');
  });

  test('returns unknown without a reliable signal', () => {
    expect(normalizeWorkMode('Flexible technology role')).toBe('unknown');
  });
});
