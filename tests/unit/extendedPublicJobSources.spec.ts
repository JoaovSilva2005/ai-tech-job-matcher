import { expect, test } from '@playwright/test';
import { mapArbeitnowJob } from '../../src/scraper/sources/arbeitnowScraper';
import { mapAshbyJob } from '../../src/scraper/sources/ashbyScraper';
import { mapJobicyJob } from '../../src/scraper/sources/jobicyScraper';
import { mapJsonLdJob, parseJobPostingJsonLd } from '../../src/scraper/sources/jsonLdScraper';
import { mapJoobleJob } from '../../src/scraper/sources/joobleScraper';
import { mapRecruiteeOffer } from '../../src/scraper/sources/recruiteeScraper';
import { mapSmartRecruitersPosting } from '../../src/scraper/sources/smartRecruitersScraper';

const SCRAPED_AT = '2026-07-10T00:00:00.000Z';

test.describe('extended public job source mappers', () => {
  test('maps an Ashby posting with explicit hybrid mode and direct apply URL', () => {
    const job = mapAshbyJob(
      {
        id: 'ashby-1',
        title: 'QA Automation Engineer',
        department: 'Engineering',
        team: 'Quality',
        employmentType: 'FullTime',
        location: 'Sao Paulo, Brazil',
        workplaceType: 'Hybrid',
        isListed: true,
        applyUrl: 'https://jobs.ashbyhq.com/acme/ashby-1/application',
        jobUrl: 'https://jobs.ashbyhq.com/acme/ashby-1',
        descriptionPlain:
          'Build reliable Playwright automation, execute API tests, and improve software quality processes.',
        publishedAt: '2026-07-01T12:00:00Z',
      },
      'acme-tech',
      SCRAPED_AT
    );

    expect(job).toMatchObject({
      id: 'ashby-acme-tech-ashby-1',
      company: 'Acme Tech',
      workMode: 'hybrid',
      source: 'ashby',
      url: 'https://jobs.ashbyhq.com/acme/ashby-1/application',
      availability: 'active',
    });
  });

  test('maps only published Recruitee offers', () => {
    const offer = {
      id: 42,
      title: 'Junior Backend Developer',
      status: 'published',
      description: '<p>Develop APIs using Node.js and TypeScript with automated tests.</p>',
      requirements: '<p>Knowledge of SQL, Git, HTTP and software quality practices.</p>',
      city: 'Campinas',
      state: 'SP',
      country: 'Brazil',
      hybrid: true,
      careers_apply_url: 'https://acme.recruitee.com/o/backend/c/new',
      updated_at: '2026-07-02T10:00:00Z',
    };
    expect(mapRecruiteeOffer(offer, 'acme', SCRAPED_AT)).toMatchObject({
      title: 'Junior Backend Developer',
      company: 'Acme',
      location: 'Campinas, SP, Brazil',
      workMode: 'hybrid',
      source: 'recruitee',
    });
    expect(mapRecruiteeOffer({ ...offer, status: 'closed' }, 'acme', SCRAPED_AT)).toBeNull();
  });

  test('maps Jooble Brazilian search results', () => {
    expect(
      mapJoobleJob(
        {
          id: 99,
          title: 'Analista de QA Junior',
          company: 'Empresa Brasil',
          location: 'Campinas, SP',
          snippet:
            'Executar testes manuais, testes de API, registrar defeitos e apoiar a automacao com Playwright.',
          link: 'https://br.jooble.org/jdp/99',
          source: 'career page',
          type: 'Full-time',
          updated: '2026-07-03T09:30:00Z',
        },
        SCRAPED_AT
      )
    ).toMatchObject({
      id: 'jooble-99',
      title: 'Analista de QA Junior',
      source: 'jooble',
      availability: 'active',
    });
  });

  test('maps SmartRecruiters posting details and rejects inactive jobs', () => {
    const posting = {
      id: 'sr-1',
      name: 'Frontend Developer',
      active: true,
      applyUrl: 'https://jobs.smartrecruiters.com/acme/sr-1',
      company: { name: 'Acme' },
      location: { city: 'Sao Paulo', region: 'SP', country: 'BR', remote: true },
      department: { label: 'Engineering' },
      releasedDate: '2026-07-04T08:00:00Z',
      jobAd: {
        sections: {
          description: {
            title: 'Job Description',
            text: 'Build accessible React interfaces with TypeScript and automated browser tests.',
          },
          qualifications: {
            title: 'Qualifications',
            text: 'Experience with APIs, Git, CSS, testing and continuous integration is required.',
          },
        },
      },
    };
    expect(mapSmartRecruitersPosting(posting, 'acme', SCRAPED_AT)).toMatchObject({
      id: 'smartrecruiters-acme-sr-1',
      workMode: 'remote',
      source: 'smartrecruiters',
    });
    expect(mapSmartRecruitersPosting({ ...posting, active: false }, 'acme', SCRAPED_AT)).toBeNull();
  });

  test('maps Jobicy and Arbeitnow feeds', () => {
    const jobicy = mapJobicyJob(
      {
        id: 7,
        jobTitle: 'Senior QA Engineer',
        companyName: 'Remote Co',
        url: 'https://jobicy.com/jobs/7',
        jobGeo: 'LATAM',
        jobIndustry: ['QA & Testing'],
        jobType: 'Full-time',
        jobDescription:
          '<p>Design Playwright automation, API contract tests, regression suites and quality metrics.</p>',
        pubDate: '2026-07-05T10:00:00Z',
      },
      SCRAPED_AT
    );
    expect(jobicy).toMatchObject({ source: 'jobicy', workMode: 'remote', location: 'LATAM' });

    const arbeitnow = mapArbeitnowJob(
      {
        slug: 'backend-engineer-1',
        title: 'Backend Engineer',
        company_name: 'Berlin Tech',
        url: 'https://www.arbeitnow.com/jobs/backend-engineer-1',
        location: 'Berlin',
        remote: false,
        tags: ['Engineering'],
        description:
          '<p>Work in a hybrid model building TypeScript APIs, SQL services and automated tests.</p>',
        created_at: 1_783_680_000,
      },
      SCRAPED_AT
    );
    expect(arbeitnow).toMatchObject({ source: 'arbeitnow', workMode: 'hybrid' });
  });

  test('parses JobPosting objects from arrays and @graph blocks', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@context":"https://schema.org","@graph":[
            {"@type":"Organization","name":"Acme"},
            {"@type":"JobPosting","title":"QA Engineer","description":"A sufficiently detailed software quality job description for automated testing.","hiringOrganization":{"name":"Acme"}}
          ]}
        </script>
        <script type="application/ld+json">not valid json</script>
      </head></html>`;
    expect(parseJobPostingJsonLd(html)).toHaveLength(1);
    expect(parseJobPostingJsonLd(html)[0].title).toBe('QA Engineer');
  });

  test('maps active JSON-LD jobs and rejects expired postings', () => {
    const posting = {
      '@type': 'JobPosting',
      identifier: { value: 'job-123' },
      title: 'QA Engineer',
      description:
        '<p>Test web applications, automate regression with Playwright, and validate REST APIs.</p>',
      datePosted: '2026-07-01',
      validThrough: '2099-12-31T23:59:59Z',
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: { name: 'Brazil' },
      hiringOrganization: { name: 'Acme' },
    };
    expect(mapJsonLdJob(posting, 'https://careers.acme.com/jobs/123', SCRAPED_AT)).toMatchObject({
      id: expect.stringMatching(/^jsonld-/),
      source: 'jsonld',
      workMode: 'remote',
      location: 'Brazil',
      availability: 'active',
    });
    expect(
      mapJsonLdJob(
        { ...posting, validThrough: '2020-01-01T00:00:00Z' },
        'https://careers.acme.com/jobs/123',
        SCRAPED_AT
      )
    ).toBeNull();
    expect(
      mapJsonLdJob(
        { ...posting, url: 'http://127.0.0.1/internal-apply' },
        'https://careers.acme.com/jobs/123',
        SCRAPED_AT
      )
    ).toBeNull();
  });
});
