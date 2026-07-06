import { expect, test } from '@playwright/test';
import { indexHtml } from '../../src/web/page';

test.describe('web page job links', () => {
  test('renders real-source job cards with apply links', () => {
    const html = indexHtml();

    expect(html).toContain('Apply to job');
    expect(html).toContain('renderJobCard');
    expect(html).toContain('jobsList');
    expect(html).toContain('<option value="themuse" selected>themuse</option>');
    expect(html).not.toContain('<option value="sample"');
  });
});
