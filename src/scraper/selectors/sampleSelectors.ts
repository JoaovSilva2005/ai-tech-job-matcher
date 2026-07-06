/**
 * CSS selectors for the local sample job board (samples/sample-jobs.html).
 * Kept in a dedicated file so selector changes never touch scraper logic —
 * the same pattern used in page-object models for UI test automation.
 */
export const sampleSelectors = {
  jobCard: 'article.job-card',
  title: '.job-title',
  company: '.job-company',
  location: '.job-location',
  workMode: '.job-work-mode',
  url: 'a.job-url',
  description: '.job-description',
} as const;
