# Interview Talking Points

## 60-Second Pitch

> I built a TypeScript application that reads a resume, collects real public tech vacancies, validates the source data, and ranks opportunities by skills, seniority, English, work mode, and location. It works without an API key through a local fallback, but it also has Gemini, OpenAI, and Anthropic adapters. Playwright covers the browser journey, API behavior, document uploads, downloads, mobile layout, and accessibility. The final Excel report includes clickable application links and a QA Issues sheet, so every filtering and ranking decision is traceable.

## Why This Project

- It solves a real junior-job-search problem instead of being a generic test exercise.
- It combines QA automation and application development in one observable workflow.
- It has realistic boundaries: files, external APIs, untrusted AI output, privacy, concurrency, and reports.

## Playwright Usage

- Chromium extracts a deterministic local job board using real navigation and locators.
- Playwright Test runs unit, integration, API, and browser E2E coverage.
- The browser test uploads a resume, analyzes a vacancy, verifies the application link, and downloads both reports.
- Axe runs inside Playwright for accessibility; a mobile test checks a 390 x 844 viewport.
- CI retains screenshot, video, and trace evidence on failure.

Public production sources use their official/public JSON endpoints or public career pages. Playwright is applied where a real browser adds test value, while structured APIs are parsed directly.

## QA Decisions Worth Explaining

- External failures are not treated as empty data. Health checks distinguish `ok`, `empty`, `unconfigured`, and `failed`.
- Closed, expired, malformed, and duplicate jobs are handled before ranking.
- Data quality and candidate match are separate scores.
- Concurrent web analyses use isolated UUID directories, preventing report overwrite.
- Provider calls have strict schemas, prompt-injection boundaries, timeout, retry, and concurrency limits.
- The local fallback makes the complete suite deterministic and free to run.

## Architecture Decisions

- Strict TypeScript at every module boundary.
- Adapter interface for AI providers and registry for job sources.
- Shared normalization into `ScrapedJob` before business rules.
- One production pipeline reused by CLI, web API, and E2E tests.
- Excel, Markdown, and JSON provide human-readable and machine-readable evidence.

## Current Evidence

- 144 automated tests passing.
- Real PDF and DOCX extraction covered.
- Six-source public health diagnostics plus aggregate mode.
- Excel workbook with six verified worksheets and clickable job links.
- GitHub Actions for CI and scheduled source monitoring.
- No API key required for demos or tests.

## Honest Next Steps

- Replace the static Brazilian city catalog with a geocoding service and cached coordinates.
- Add historical snapshots to show source reliability and skill-demand trends over time.
- Add visual regression baselines for the most important web states.
- Compare keyword fallback ranking with an optional embedding-based approach using a labeled evaluation set.
