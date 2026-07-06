import { expect, test } from '@playwright/test';
import { normalizeWhitespace, repairMojibake } from '../../src/utils/text';

test.describe('repairMojibake', () => {
  test('recovers UTF-8 text that was double-encoded as Latin-1', () => {
    const original = 'سلام'; // Arabic, as returned correctly by a good source
    const mojibake = Buffer.from(original, 'utf8').toString('latin1'); // the bug
    expect(mojibake).not.toBe(original);
    expect(repairMojibake(mojibake)).toBe(original);
  });

  test('leaves correctly-encoded accented text untouched', () => {
    for (const value of ['São Paulo', 'Brasília', 'Remote — LATAM', 'Zürich', 'plain ascii']) {
      expect(repairMojibake(value)).toBe(value);
    }
  });

  test('leaves empty and plain strings untouched', () => {
    expect(repairMojibake('')).toBe('');
    expect(repairMojibake('Junior QA Engineer')).toBe('Junior QA Engineer');
  });

  test('normalizeWhitespace repairs mojibake and collapses spaces', () => {
    const mojibake = Buffer.from('São  Paulo', 'utf8').toString('latin1');
    expect(normalizeWhitespace(mojibake)).toBe('São Paulo');
  });
});
