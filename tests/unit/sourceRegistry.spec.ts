import { expect, test } from '@playwright/test';
import { resetEnvCache } from '../../src/config/env';
import { getSourceConfiguration } from '../../src/scraper/sourceRegistry';

test.describe('source configuration', () => {
  test('distinguishes no-key defaults from sources that require operator configuration', () => {
    const original = snapshot([
      'ASHBY_BOARD_NAMES',
      'RECRUITEE_COMPANY_SUBDOMAINS',
      'JOOBLE_API_KEY',
      'SMARTRECRUITERS_COMPANY_IDS',
      'JSONLD_JOB_URLS',
    ]);
    process.env.ASHBY_BOARD_NAMES = 'Ashby';
    process.env.RECRUITEE_COMPANY_SUBDOMAINS = '';
    process.env.JOOBLE_API_KEY = '';
    process.env.SMARTRECRUITERS_COMPANY_IDS = 'smartrecruiters';
    process.env.JSONLD_JOB_URLS = '';
    resetEnvCache();

    try {
      expect(getSourceConfiguration('ashby')).toEqual({ configured: true });
      expect(getSourceConfiguration('smartrecruiters')).toEqual({ configured: true });
      expect(getSourceConfiguration('jobicy')).toEqual({ configured: true });
      expect(getSourceConfiguration('arbeitnow')).toEqual({ configured: true });
      expect(getSourceConfiguration('recruitee').configured).toBe(false);
      expect(getSourceConfiguration('jooble').configured).toBe(false);
      expect(getSourceConfiguration('jsonld').configured).toBe(false);
    } finally {
      restoreSnapshot(original);
    }
  });

  test('enables configured Recruitee, Jooble and JSON-LD sources', () => {
    const original = snapshot([
      'RECRUITEE_COMPANY_SUBDOMAINS',
      'JOOBLE_API_KEY',
      'JSONLD_JOB_URLS',
    ]);
    process.env.RECRUITEE_COMPANY_SUBDOMAINS = 'acme';
    process.env.JOOBLE_API_KEY = 'test-key';
    process.env.JSONLD_JOB_URLS = 'https://careers.example.org/jobs/qa';
    resetEnvCache();

    try {
      expect(getSourceConfiguration('recruitee')).toEqual({ configured: true });
      expect(getSourceConfiguration('jooble')).toEqual({ configured: true });
      expect(getSourceConfiguration('jsonld')).toEqual({ configured: true });
    } finally {
      restoreSnapshot(original);
    }
  });
});

function snapshot(names: string[]): Map<string, string | undefined> {
  return new Map(names.map((name) => [name, process.env[name]]));
}

function restoreSnapshot(values: Map<string, string | undefined>): void {
  for (const [name, value] of values) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  resetEnvCache();
}
