# Architecture — AI Tech Job Matcher

## Main Pipeline

The CLI entry point (`src/index.ts`, `runPipeline`) orchestrates 12 sequential steps:

```
resume file ──► parse ──► sanitize (PII) ──► analyze resume (AI | fallback)
                                                        │
job source ──► scrape (Playwright) ──► validate (QA) ──► dedupe ──► analyze jobs (AI | fallback)
                                                        │
                                          filter by role ──► match score ──► rank
                                                        │
                       Excel (6 sheets) ◄── reports ──► Markdown summary + 4 JSON artifacts
```

`runPipeline` is exported, so E2E tests import and run the exact production pipeline without
spawning subprocesses.

## Modules

| Module | Responsibility |
|--------|----------------|
| `src/cli` | Argument parsing/validation and CLI types |
| `src/config` | Environment loading with Zod validation (`.env`) |
| `src/resume` | Parse (TXT/PDF/DOCX), sanitize PII, analyze resume |
| `src/scraper` | Source registry, Playwright scrapers, per-source selectors, job validation facade |
| `src/ai` | AI adapter interface, Gemini/OpenAI/Anthropic clients, local fallback analyzer, prompts, JSON repair |
| `src/matcher` | Skill normalization, role classification, hybrid match scoring, recommendations, explanations |
| `src/qa` | Validation rules, issue detection, duplicate detector, data quality scoring |
| `src/reports` | Excel workbook (ExcelJS), Markdown summary, shared report types and styles |
| `src/web` | Optional Express web UI for resume upload, pipeline execution and report download |
| `src/utils` | Logger, file system, date, text and URL helpers |

## Data Flow

All data crossing module boundaries is typed: `ScrapedJob` → `JobValidationResult` →
`JobAnalysis` → `JobMatchResult` → `ReportData`. AI responses are untrusted input: they pass
through a defensive JSON parser and Zod schemas (with `.catch()` defaults per field) before
entering the typed domain.

## AI Adapter Strategy

`AiClient` is a small interface (`analyzeResume`, `analyzeJob`). Three implementations:

- `RemoteAiClient` wrapping **Gemini** (generateContent), **OpenAI** (Chat Completions) or **Anthropic** (Messages), all
  via plain `fetch` — no SDK dependencies.
- `FallbackAiClient` delegating to the local keyword analyzer.

`getAiClient()` selects the implementation from `AI_PROVIDER` + available keys, and every
remote failure degrades to the fallback at the call site, so a single job analysis failure
never aborts the run.

## Fallback Mode

The fallback analyzer (`src/ai/fallbackAnalyzer.ts`) uses curated keyword dictionaries with
alias matching (symbol-safe word boundaries for `node.js`, `c#`, `ci/cd`) to extract skills,
seniority, English level and role classification. It shares the same output types as the AI
path, so downstream code is provider-agnostic. `fallbackMode: true` is carried through to the
reports for transparency.

## Report Generation

`ReportData` (matches + resume analysis + execution summary + market insights) feeds two
generators: ExcelJS builds a six-sheet workbook (styles centralized in `excelStyles.ts`), and
a Markdown generator writes the human-readable run summary. Intermediate JSONs are written for
auditability. Reports never contain raw resume text — only the structured analysis.
