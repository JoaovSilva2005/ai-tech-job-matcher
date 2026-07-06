import { expect, test } from '@playwright/test';
import { mapGreenhouseJob } from '../../src/scraper/sources/greenhouseScraper';
import { mapLeverPosting } from '../../src/scraper/sources/leverScraper';
import { mapTheMuseJob } from '../../src/scraper/sources/theMuseScraper';
import { parseCommaList } from '../../src/scraper/sources/publicApiUtils';

const SCRAPED_AT = '2026-07-06T00:00:00.000Z';

test.describe('public job source mappers', () => {
  test('maps The Muse public API jobs into the common ScrapedJob contract', () => {
    const job = mapTheMuseJob(
      {
        id: 123,
        name: 'QA Automation Engineer',
        contents: '<p>Build test automation with Playwright, TypeScript and API testing.</p>',
        locations: [{ name: 'Remote' }],
        categories: [{ name: 'Computer and IT' }],
        levels: [{ name: 'Entry Level', short_name: 'entry' }],
        refs: { landing_page: 'https://www.themuse.com/jobs/acme/qa-automation' },
        company: { name: 'Acme' },
      },
      SCRAPED_AT
    );

    expect(job).toMatchObject({
      id: 'themuse-123',
      title: 'QA Automation Engineer',
      company: 'Acme',
      location: 'Remote',
      workMode: 'remote',
      url: 'https://www.themuse.com/jobs/acme/qa-automation',
      source: 'themuse',
      scrapedAt: SCRAPED_AT,
    });
    expect(job!.description).toContain('Playwright');
  });

  test('maps Greenhouse Job Board API jobs and decodes escaped HTML content', () => {
    const job = mapGreenhouseJob(
      {
        id: 456,
        title: 'Frontend Developer',
        company_name: 'Stripe',
        absolute_url: 'https://stripe.com/jobs/search?gh_jid=456',
        location: { name: 'Sao Paulo, Brazil' },
        departments: [{ name: 'Engineering' }],
        content:
          '&lt;p&gt;Build React interfaces, write TypeScript, and collaborate with QA automation.&lt;/p&gt;',
      },
      'stripe',
      SCRAPED_AT
    );

    expect(job).toMatchObject({
      id: 'greenhouse-stripe-456',
      title: 'Frontend Developer',
      company: 'Stripe',
      location: 'Sao Paulo, Brazil',
      url: 'https://stripe.com/jobs/search?gh_jid=456',
      source: 'greenhouse',
    });
    expect(job!.description).toContain('React interfaces');
    expect(job!.description).not.toContain('&lt;');
  });

  test('maps Lever postings into the common ScrapedJob contract', () => {
    const job = mapLeverPosting(
      {
        id: 'abc',
        text: 'Backend Engineer',
        hostedUrl: 'https://jobs.lever.co/acme/abc',
        descriptionPlain: 'Build Node.js services and APIs with automated tests.',
        additionalPlain: 'Experience with SQL, monitoring and incident response is helpful.',
        categories: {
          location: 'Remote',
          team: 'Engineering',
          commitment: 'Full-time',
        },
      },
      'acme-tech',
      SCRAPED_AT
    );

    expect(job).toMatchObject({
      id: 'lever-acme-tech-abc',
      title: 'Backend Engineer',
      company: 'Acme Tech',
      location: 'Remote',
      workMode: 'remote',
      url: 'https://jobs.lever.co/acme/abc',
      source: 'lever',
    });
    expect(job!.description).toContain('Node.js services');
  });

  test('parseCommaList trims blanks and ignores empty entries', () => {
    expect(parseCommaList(' stripe, figma ,, coinbase ')).toEqual([
      'stripe',
      'figma',
      'coinbase',
    ]);
  });
});
