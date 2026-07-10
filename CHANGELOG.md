# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

## Unreleased

## 1.2.0 - 2026-07-10

### Added

- Ashby, Recruitee, Jooble Brazil, SmartRecruiters, Jobicy, and Arbeitnow collectors.
- Authorized JSON-LD `JobPosting` collection with `robots.txt`, private-URL, size, and page limits.
- Mapper, authentication, cache, source-configuration, and request-cap coverage for the new integrations.

### Changed

- Public source aggregation now supports 13 sources and exposes configuration state in the web UI.
- Candidate location is forwarded to sources with native location search, including Jooble.
- Jobicy feed responses are cached for one hour to follow its documented fair-use guidance.
- Repeated role-filter logic now uses a single shared source contract.

## 1.1.0 - 2026-07-09

### Added

- Express web UI with resume upload, public-job search, and specific-vacancy analysis.
- Real public sources for Gupy, RemoteOK, Remotive, The Muse, Greenhouse, and Lever.
- Remote, hybrid, and on-site filters plus Brazilian city/distance prioritization.
- Per-source health diagnostics and a scheduled GitHub Actions workflow.
- API, upload, download, concurrent-run, accessibility, mobile, timeout, retry, and request-cap tests.
- Excel application hyperlinks, availability, publication date, source, validation status, and data quality columns.

### Changed

- AI provider responses now use strict schemas, untrusted-content prompts, bounded retries, timeouts, and concurrency.
- Resume sanitization removes direct identifiers before any provider request.
- Web reports use isolated UUID directories and expire automatically.
- PDF parsing uses the current typed `pdf-parse` API and is covered with a real generated PDF.
- CI now checks formatting, audits production dependencies, tests the compiled app, and uploads Playwright failure evidence.

### Fixed

- `demo:all` aggregation and all-source failure semantics.
- The `all` role now excludes commercial/non-technical postings with incidental tech keywords.
- Source outages no longer appear as valid empty feeds.
- Closed and expired jobs no longer enter the ranking.
- Work-mode normalization correctly gives hybrid signals precedence.
- Gemini resume analysis accepts valid native-language proficiency without unnecessary fallback.
- Concurrent web analyses no longer overwrite each other's reports.
- README and CLI use a version-stable direct `tsx` invocation for custom arguments.

## 1.0.0 - 2026-07-05

### Added

- Strict TypeScript CLI pipeline for resume analysis and job matching.
- Local no-key analyzer plus Gemini, OpenAI, and Anthropic adapters.
- Job validation, deduplication, match scoring, explanations, and study plans.
- Six-sheet Excel report, Markdown summary, and four JSON evidence files.
- Playwright fixture scraper and initial unit/E2E coverage.
- Architecture, QA strategy, test plan, test cases, bug report template, and collection policy.
