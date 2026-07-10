import fs from 'fs';
import os from 'os';
import path from 'path';
import { expect, test } from '@playwright/test';
import { cleanupExpiredReportRuns } from '../../src/web/server';

test.describe('web report run cleanup', () => {
  test('removes only expired UUID report directories', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tech-job-matcher-runs-'));
    const oldRun = '00000000-0000-4000-8000-000000000001';
    const currentRun = '00000000-0000-4000-8000-000000000002';
    const unrelated = 'manual-notes';
    const now = Date.parse('2026-07-09T12:00:00.000Z');
    const ttl = 30 * 60 * 1000;

    try {
      for (const directory of [oldRun, currentRun, unrelated]) {
        fs.mkdirSync(path.join(root, directory));
      }
      fs.utimesSync(path.join(root, oldRun), new Date(now - ttl - 1), new Date(now - ttl - 1));
      fs.utimesSync(path.join(root, currentRun), new Date(now), new Date(now));

      expect(cleanupExpiredReportRuns(root, now, ttl)).toEqual([oldRun]);
      expect(fs.existsSync(path.join(root, oldRun))).toBe(false);
      expect(fs.existsSync(path.join(root, currentRun))).toBe(true);
      expect(fs.existsSync(path.join(root, unrelated))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
