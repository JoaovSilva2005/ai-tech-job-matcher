# Architecture

## Entry Points

| Entry point                 | Responsibility                                        |
| --------------------------- | ----------------------------------------------------- |
| `src/index.ts`              | CLI orchestration and reusable `runPipeline` function |
| `src/web/server.ts`         | Express upload, analysis, and report-download API     |
| `src/tools/checkSources.ts` | Live public-source diagnostics                        |

The CLI and web API call the same production pipeline. E2E tests import `runPipeline`, so they do not duplicate business logic.

## Pipeline

```mermaid
flowchart LR
  A["Resume: TXT, MD, PDF, DOCX"] --> B["Parse and enforce limits"]
  B --> C["Remove direct identifiers"]
  C --> D["Analyze resume"]
  E["Public job sources"] --> F["Normalize source contracts"]
  F --> G["Validate and deduplicate"]
  D --> H["Analyze jobs"]
  G --> H
  H --> I["Filter role and work mode"]
  I --> J["Score skills, seniority, English, and location"]
  J --> K["Excel, Markdown, JSON"]
```

The pipeline has 12 observable steps and returns typed results plus generated file paths.

## Module Boundaries

| Module        | Responsibility                                                                            |
| ------------- | ----------------------------------------------------------------------------------------- |
| `src/ai`      | Provider adapters, strict response schemas, prompts, retry/timeout client, local fallback |
| `src/cli`     | Argument parsing, validation, and CLI contracts                                           |
| `src/config`  | Zod-validated environment configuration                                                   |
| `src/matcher` | Role classification, skill normalization, scoring, location preference, explanations      |
| `src/qa`      | Validation rules, deduplication, and data quality score                                   |
| `src/reports` | Excel and Markdown generation                                                             |
| `src/resume`  | File parsing, extraction limits, and personal-data sanitization                           |
| `src/scraper` | Source registry, public collectors, normalization, health checks                          |
| `src/web`     | Web API, isolated report runs, and browser UI                                             |

The main typed flow is `ScrapedJob` -> `JobValidationResult` -> `JobAnalysis` -> `JobMatchResult` -> `ReportData`.

## External Boundaries

### Job Sources

Each collector maps a third-party payload into `ScrapedJob`. HTTP failures throw `SourceUnavailableError`; an empty successful feed remains a valid empty result. The `all` source runs configured collectors in parallel, isolates individual failures, and fails explicitly if every configured source is unavailable.

The registry contains 13 public sources across direct feeds, ATS APIs, a keyed Brazilian search API, and authorized JSON-LD pages. Greenhouse, Lever, Ashby, Recruitee, SmartRecruiters, Gupy, and JSON-LD have organization/page caps. Jobicy uses a one-hour in-memory cache to honor its fair-use guidance. The scheduled source-health workflow records `ok`, `empty`, `unconfigured`, or `failed` for every integration.

### AI Providers

`AiClient` supports Gemini, OpenAI, Anthropic, and local fallback. Remote calls share timeout, retry, backoff, and concurrency controls. Resume/job text is treated as untrusted content, and provider responses must pass strict Zod schemas before entering the domain.

Missing keys, invalid JSON, rate limits, and provider failures degrade to local analysis. The report always records which engine was used.

## Privacy and Web Report Lifecycle

The resume is sanitized before any provider call. Raw text, names, contact details, and addresses are not persisted in reports. Web uploads are deleted in a `finally` block after each request.

Every web request receives a UUID run directory under `output/web/`. Download URLs include that run ID, concurrent requests cannot overwrite each other, invalid paths are rejected, and expired run directories are removed automatically.

## Outputs

ExcelJS creates six worksheets. Markdown provides a portable summary with application links, while four JSON files preserve normalized source data, analysis, and match evidence for debugging and auditability.
