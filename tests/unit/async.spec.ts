import { expect, test } from '@playwright/test';
import { mapWithConcurrency } from '../../src/utils/async';

test.describe('mapWithConcurrency', () => {
  test('preserves result order and respects the worker limit', async () => {
    let active = 0;
    let peak = 0;

    const results = await mapWithConcurrency([30, 10, 20, 5], 2, async (delayMs, index) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      active -= 1;
      return `result-${index}`;
    });

    expect(results).toEqual(['result-0', 'result-1', 'result-2', 'result-3']);
    expect(peak).toBe(2);
  });

  test('rejects invalid concurrency values', async () => {
    await expect(mapWithConcurrency([1], 0, async (value) => value)).rejects.toThrow(
      'positive integer'
    );
  });
});
