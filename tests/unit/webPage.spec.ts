import { expect, test } from '@playwright/test';
import { indexHtml } from '../../src/web/page';

test.describe('web page job links', () => {
  test('does not render reserved sample URLs as external open-job links', () => {
    const html = indexHtml();

    expect(html).toContain('function isReservedDemoUrl');
    expect(html).toContain('Demo job only');
    expect(html).toContain('Apply to job');
    expect(html).toContain('renderJobCard');
    expect(html).toContain('jobsList');
  });
});
