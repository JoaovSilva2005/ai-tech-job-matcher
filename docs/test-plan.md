# Test Plan — AI Tech Job Matcher

## Objective

Verify that the AI Tech Job Matcher pipeline reliably transforms a resume and a set of public
job postings into an accurate, well-formatted Excel ranking — with correct data validation,
duplicate removal, match scoring and report generation — in a fully offline setup (no API key).

## Scope

- Resume parsing (TXT, PDF, DOCX) and error handling for invalid inputs.
- Resume sanitization (emails, phones, personal documents).
- Job scraping from the local sample source using a real Playwright browser.
- Role classification, seniority detection and English level detection (fallback analyzer).
- QA validation rules for scraped jobs (required fields, URL, description length, work mode).
- Duplicate detection by normalized title+company and by normalized URL.
- Match score calculation, recommendation bands and explanation generation.
- Excel report structure (6 sheets), sorting, filtering and formatting.
- Markdown summary and intermediate JSON outputs.
- Fallback mode behavior when no AI API key is configured.

## Out of Scope

- Live scraping of third-party websites in CI (the remoteok/generic sources are best-effort
  and intentionally not covered by automated tests to keep the suite deterministic).
- Real AI provider responses (OpenAI/Anthropic calls are exercised manually; automated tests
  always run in fallback mode).
- Visual/pixel-level validation of the Excel file (structure and data are validated instead).
- Load/performance testing of the pipeline itself.

## Test Levels

| Level | Tooling | What it covers |
|-------|---------|----------------|
| Unit | Playwright Test (node) | normalizeSkills, classifyRole, calculateMatchScore, validateJob, duplicateDetector, fallbackAnalyzer |
| Integration/E2E | Playwright Test + Chromium | sample scraper against real HTML, full pipeline runs, Excel/Markdown/JSON artifact validation |

## Test Environment

- Node.js 18+ (developed on Node 22), Windows/Linux/macOS.
- Playwright Chromium installed via `npx playwright install chromium`.
- No network access required; no environment variables required (fallback mode).
- Config: `screenshot: only-on-failure`, `trace: on-first-retry`, `video: retain-on-failure`.

## Risks

- Third-party job boards may change markup or availability (mitigated: sample source is the
  demo default; real sources fail gracefully returning empty lists).
- Keyword-based fallback analysis may misclassify unusual job titles (mitigated: scoring
  heuristics tested against 16 realistic fixtures; AI mode available for higher accuracy).
- PDF text extraction quality varies by file (mitigated: minimum text length check + clear
  error messages).

## Entry Criteria

- `npm install` and `npx playwright install chromium` completed successfully.
- Sample fixtures present (`samples/sample-jobs.html`, `samples/sample-resume.txt`).

## Exit Criteria

- 100% of unit and E2E tests passing (`npm test`).
- Both demo commands (`npm run demo:qa`, `npm run demo:all`) generate all six output artifacts.
- No high-severity defects open against the ranking or report generation.
