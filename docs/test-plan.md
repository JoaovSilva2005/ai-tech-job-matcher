# Test Plan

## Objective

Verify that the application safely transforms a resume and public job data into accurate, traceable rankings and downloadable reports, with deterministic behavior when no API key is configured.

## In Scope

- TXT, Markdown, PDF, and DOCX extraction, size limits, and invalid uploads.
- Personal-data sanitization before provider calls and persistence.
- Public-source mapping, authentication, caching, request caps, failure semantics, and health status.
- Authorized JSON-LD parsing, expiration, robots policy, size limits, and private-URL rejection.
- Job validation, availability, publication/expiration dates, and deduplication.
- Role, work mode, seniority, English, skill, and location matching.
- Local fallback plus mocked Gemini/OpenAI/Anthropic contracts.
- Excel, Markdown, and JSON content and privacy.
- Web API upload/download/error paths and concurrent report isolation.
- Browser journey, application link, mobile layout, and accessibility.
- Compiled production build smoke test.

## Out of Scope

- Live third-party source calls in the deterministic CI suite. A separate scheduled workflow covers them.
- Live paid AI calls. Provider HTTP contracts and fallback paths are tested with mocks.
- High-volume load testing or production capacity planning.
- Pixel-perfect Excel rendering across every spreadsheet application.

## Test Matrix

| Level         | Tool                       | Main coverage                                                    |
| ------------- | -------------------------- | ---------------------------------------------------------------- |
| Unit          | Playwright Test            | Pure logic, parsers, validation rules, provider/source contracts |
| Integration   | Playwright Test            | Full pipeline and generated artifacts                            |
| API           | Playwright request context | Multipart upload, validation, downloads, concurrency             |
| E2E           | Playwright Chromium        | Complete user journey and external application link              |
| Accessibility | Axe + Chromium             | Serious/critical WCAG findings                                   |
| Operational   | GitHub Actions             | CI and scheduled source health                                   |

## Environment

- Node.js 22.3 or newer.
- Playwright Chromium installed with `npx playwright install chromium`.
- No `.env` or network required for `npm test`.
- Failure evidence: screenshot, video, and trace.

## Risks and Mitigations

| Risk                                        | Mitigation                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Public API or page changes                  | Mapper tests, explicit source errors, scheduled 13-source health evidence |
| Stale or closed vacancy                     | Availability/date rules and exclusion of high-severity issues             |
| AI returns malformed or injected content    | Untrusted-content prompts, strict Zod schemas, bounded retry, fallback    |
| Resume leaks personal information           | Sanitization, output assertions, upload deletion                          |
| Concurrent users overwrite reports          | UUID run directories and concurrent API test                              |
| Keyword fallback misclassifies unusual text | Transparent engine flag, deterministic tests, optional provider adapters  |

## Entry Criteria

- `npm install` completed.
- Chromium installed.
- Sample fixtures available.

## Exit Criteria

- `npm run format:check`, `npm run build`, `npm run test:dist`, `npm run lint`, and `npm test` pass.
- `npm audit --omit=dev --audit-level=high` reports no high-severity production vulnerability.
- `npm run demo:qa` and `npm run demo:all` generate all report types.
- `npm run sources:check` records at least one healthy public source.
- No known high-severity defect remains in upload, ranking, privacy, or downloads.
