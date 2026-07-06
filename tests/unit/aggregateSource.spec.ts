import { expect, test } from '@playwright/test';
import { interleave } from '../../src/scraper/jobScraper';
import { SELECTABLE_SOURCES, VALID_SOURCES } from '../../src/cli/cliTypes';

test.describe('interleave (all-sources merge)', () => {
  test('round-robins across lists to preserve variety', () => {
    const result = interleave([
      ['a1', 'a2', 'a3'],
      ['b1', 'b2'],
      ['c1'],
    ]);
    expect(result).toEqual(['a1', 'b1', 'c1', 'a2', 'b2', 'a3']);
  });

  test('handles empty and uneven lists', () => {
    expect(interleave([])).toEqual([]);
    expect(interleave([[], [], []])).toEqual([]);
    expect(interleave([['x'], [], ['y', 'z']])).toEqual(['x', 'y', 'z']);
  });

  test('a single list is returned in order', () => {
    expect(interleave([['1', '2', '3']])).toEqual(['1', '2', '3']);
  });

  test('preserves every element (no loss)', () => {
    const lists = [
      ['a', 'b', 'c', 'd'],
      ['e', 'f'],
      ['g', 'h', 'i'],
    ];
    const flatCount = lists.reduce((n, l) => n + l.length, 0);
    expect(interleave(lists)).toHaveLength(flatCount);
  });
});

test.describe('selectable sources', () => {
  test('includes every public source plus the "all" aggregate', () => {
    for (const source of VALID_SOURCES) {
      expect(SELECTABLE_SOURCES).toContain(source);
    }
    expect(SELECTABLE_SOURCES).toContain('all');
    expect(SELECTABLE_SOURCES).not.toContain('sample');
  });
});
