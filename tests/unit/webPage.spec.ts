import { expect, test } from '@playwright/test';
import { indexHtml } from '../../src/web/page';

test.describe('web page', () => {
  test('renders the job-card UI with apply links and download actions', () => {
    const html = indexHtml();

    // job cards are built client-side and carry an "Apply" link per posting
    expect(html).toContain('function card(');
    expect(html).toContain('cardsList');
    expect(html).toContain('apply-link');
    expect(html).toContain('Apply ↗');

    // report download entry points consume run-specific URLs returned by the server
    expect(html).toContain('data.downloadUrl');
    expect(html).toContain('data.markdownUrl');
  });

  test('offers only public sources (no sample) with Gupy as default', () => {
    const html = indexHtml();

    expect(html).toContain('<option value="gupy" selected>');
    expect(html).toContain('<option value="themuse">');
    expect(html).toContain('<option value="all">');
    expect(html).not.toContain('<option value="sample"');
    for (const source of [
      'remoteok',
      'remotive',
      'greenhouse',
      'lever',
      'ashby',
      'recruitee',
      'jooble',
      'smartrecruiters',
      'jobicy',
      'arbeitnow',
      'jsonld',
    ]) {
      expect(html).toContain(`<option value="${source}">`);
    }
  });

  test('posts to the analyze endpoint', () => {
    const html = indexHtml();
    expect(html).toContain('/api/analyze');
    expect(html).toContain('name="workMode"');
    expect(html).toContain('name="userLocation"');
    expect(html).toContain('name="jobDescription"');
    expect(html).toContain('name="jobTitle"');
    expect(html).toContain('name="jobCompany"');
    expect(html).toContain('name="jobUrl"');
    expect(html).toContain('name="jobLocation"');
    expect(html).toContain('name="jobWorkMode"');
    expect(html).toContain('name="analysisMode"');
    expect(html).toContain("fd.append('workMode'");
    expect(html).toContain("fd.append('userLocation'");
    expect(html).toContain("fd.append('jobDescription'");
  });

  test('separates public search from specific-job analysis', () => {
    const html = indexHtml();

    expect(html).toContain('Search public jobs');
    expect(html).toContain('Analyze one job');
    expect(html).toContain('id="specificJobFields"');
    expect(html).toContain('function syncAnalysisMode()');
  });

  test('does not render mock The Muse results when the backend is unreachable', () => {
    const html = indexHtml();

    expect(html).not.toContain('MOCK_MATCHES');
    expect(html).not.toContain('mockAnalyze');
    expect(html).not.toContain('source: "themuse"');
  });
});
