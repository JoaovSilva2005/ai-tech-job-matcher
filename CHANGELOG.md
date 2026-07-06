# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/).

## [1.0.0] - 2026-07-05

### Added

- CLI pipeline (`--resume`, `--role`, `--source`, `--limit`, `--output`, `--fallback`, `--debug`).
- Resume parsing for TXT, PDF (pdf-parse) and DOCX (mammoth) with PII sanitization.
- Playwright scrapers: offline `sample` source (16 fictional jobs + intentional duplicate),
  best-effort `remoteok` (public API, single request) and `generic` (configurable URL) sources.
- QA layer: validation rules with severity, data quality score, duplicate detector,
  seniority-mismatch warnings.
- AI adapter layer: OpenAI and Anthropic clients over fetch, defensive JSON repair, Zod
  schema validation, automatic fallback to the local keyword analyzer (no API key required).
- Hybrid match scoring (0–100) with recommendation bands, explanations and study plans.
- Excel report with six sheets (Ranking, Details, QA Issues, Resume Analysis, Market
  Insights, Execution Summary), Markdown execution summary and four JSON artifacts.
- 53 automated tests (unit + E2E) with Playwright Test; ESLint + Prettier configuration.
- Documentation: README, test plan, test cases, bug report template, QA strategy, scraping
  ethics, architecture and interview talking points.
