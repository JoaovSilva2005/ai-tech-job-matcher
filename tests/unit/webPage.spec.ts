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

    // report download entry points wired to the server endpoints
    expect(html).toContain('/api/download/excel');
    expect(html).toContain('/api/download/summary');
  });

  test('offers only public sources (no sample) with The Muse as default', () => {
    const html = indexHtml();

    expect(html).toContain('<option value="themuse" selected>');
    expect(html).not.toContain('<option value="sample"');
    for (const source of ['remoteok', 'remotive', 'greenhouse', 'lever']) {
      expect(html).toContain(`<option value="${source}">`);
    }
  });

  test('posts to the analyze endpoint', () => {
    const html = indexHtml();
    expect(html).toContain('/api/analyze');
  });
});
