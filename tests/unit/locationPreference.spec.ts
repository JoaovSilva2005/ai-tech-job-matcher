import { expect, test } from '@playwright/test';
import { scoreLocationPreference } from '../../src/matcher/locationPreference';
import type { ScrapedJob } from '../../src/scraper/types';

function job(overrides: Partial<ScrapedJob>): ScrapedJob {
  return {
    id: 'job-1',
    title: 'QA Analyst',
    company: 'Example Co',
    location: 'Campinas, Brazil',
    workMode: 'hybrid',
    url: 'https://jobs.example.com/qa',
    description: 'Hybrid role in Campinas for QA analysts.',
    source: 'test',
    scrapedAt: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

test.describe('location preference', () => {
  test('scores exact city matches highest', () => {
    const result = scoreLocationPreference(job({}), 'Campinas, SP');

    expect(result.score).toBe(12);
    expect(result.label).toContain('same city');
  });

  test('uses geographic distance for regional matches', () => {
    const result = scoreLocationPreference(
      job({ location: 'Sao Paulo, Brazil', description: 'Hybrid role in Sao Paulo.' }),
      'Campinas, SP'
    );

    expect(result.score).toBe(7);
    expect(result.label).toContain('regional match');
    expect(result.distanceKm).toBeGreaterThan(70);
    expect(result.distanceKm).toBeLessThan(100);
  });

  test('scores a nearby city below an exact city and above a regional match', () => {
    const result = scoreLocationPreference(
      job({ location: 'Jundiai, SP', description: 'Hybrid role in Jundiai.' }),
      'Campinas, SP'
    );

    expect(result.score).toBe(10);
    expect(result.label).toContain('nearby');
    expect(result.distanceKm).toBeLessThan(75);
  });

  test('falls back to all-state matching for cities outside the coordinate catalog', () => {
    const result = scoreLocationPreference(
      job({ location: 'Ribeirao Preto, SP', description: 'On-site role.' }),
      'Americana, SP'
    );

    expect(result.score).toBe(6);
    expect(result.label).toBe('same state (SP)');
  });

  test('keeps remote jobs relevant when city does not match', () => {
    const result = scoreLocationPreference(
      job({ location: 'Remote - Brazil', workMode: 'remote', description: 'Fully remote.' }),
      'Campinas, SP'
    );

    expect(result.score).toBe(4);
    expect(result.label).toBe('remote-friendly');
  });
});
