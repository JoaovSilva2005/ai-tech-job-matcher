# Interview Talking Points — AI Tech Job Matcher

## The 60-second pitch (ready answer, in English)

> I built AI Tech Job Matcher, a TypeScript project that uses Playwright to collect public
> tech job opportunities, analyzes a candidate resume with AI or a local fallback engine, and
> generates an Excel report ranking the best job matches. The project demonstrates web
> automation, data validation, QA mindset, report generation, error handling and clean
> TypeScript architecture.

## Short version

> It is a Playwright and AI-based job matching tool that compares a resume with tech job
> descriptions and generates an Excel ranking with match scores, missing skills and study
> recommendations.

## Why I created this project

- I wanted one portfolio project that proves both QA automation skills and software
  development skills, solving a problem I actually have: figuring out which junior tech jobs
  fit my profile and what to study to close the gaps.
- It forces real-world engineering concerns into one codebase: untrusted data, external
  APIs, privacy, reporting and automated testing.

## How Playwright was used

- A real Chromium browser scrapes a local HTML job board (`file://` page) — the same
  navigation, locators and extraction flow used on live sites, but deterministic and offline.
- Playwright's request API powers the best-effort RemoteOK source.
- Playwright Test runs the whole test suite: unit tests for pure logic and E2E tests that
  execute the full pipeline and assert on the generated Excel workbook.
- Selectors live in dedicated files (page-object style), so markup changes don't touch logic.

## How the AI was integrated

- A provider-agnostic `AiClient` interface with Gemini, OpenAI and Anthropic implementations
  over plain `fetch`, selected by environment variable.
- AI responses are treated as untrusted input: markdown-fence stripping, JSON repair, Zod
  schema validation with per-field defaults, one "fix your JSON" retry, then fallback.
- A keyword-based local analyzer guarantees the tool works with zero API keys — which also
  makes tests deterministic and free.

## How the score is calculated

- Hybrid rule-based model, 0–100: skills overlap (30), role compatibility (15), seniority
  compatibility (20), English (10), tools (10), related project/experience evidence (10),
  work mode (5); penalties for critical missing skills (−20) and senior-job-vs-junior-profile
  (−25). Bands map to recommendations from `strong_apply` (85+) to `not_recommended` (<30).
- Every score ships with a human-readable explanation and a study plan, so the number is
  auditable, not a black box.

## How the project demonstrates QA mindset

- Every scraped job passes a validation gate with severity-ranked issues; bad data is
  excluded with evidence (QA Issues sheet), never silently.
- Duplicate detection, data quality scoring, seniority-mismatch warnings.
- Test plan, 18 documented test cases, bug report template, and 63 automated tests with
  failure evidence (screenshot/trace/video) configured.

## How it also demonstrates TypeScript development

- Strict TypeScript, modular architecture with typed boundaries, adapter pattern for AI
  providers, registry pattern for scraper sources, defensive parsing, centralized styles,
  clean CLI with validation, and a build that compiles to plain Node.js.

## Future improvements

- Add screenshots or a short GIF of the CLI, web UI and Excel report.
- Upgrade the simple web UI into a richer React/Vite interface if the project needs a larger
  frontend showcase.
- More real sources behind the same scraper interface, each with its own ethical caps.
- Embedding-based semantic matching instead of keyword overlap in fallback mode.
- Historical tracking: run weekly, diff the market, chart skill demand over time.
- CI pipeline publishing the HTML test report as an artifact.
