# QA Strategy — AI Tech Job Matcher

This project treats scraped data the way a QA engineer treats an application under test:
nothing is trusted until it is validated, and every quality decision is observable in the
final report.

## Data Validation

Every scraped job passes through a rule-based validation gate (`src/qa/validationRules.ts`)
before analysis:

- Title and company must not be empty (**high** severity).
- URL must be a valid http/https URL (**high**).
- Description must have at least 100 characters (**medium**) and is flagged as generic when
  it is suspiciously short (**low**).
- Work mode must normalize to remote/hybrid/onsite (**low** when unknown).
- Scrape timestamp must be a valid ISO date (**low**).

Jobs with any high severity issue are marked `invalid` and excluded from the ranking; medium
issues mark the job `needs_review` but keep it visible. All issues land in the **QA Issues**
sheet of the Excel report — evidence, not silent filtering.

## Error Handling

- CLI arguments are validated with explicit messages and usage help (`CliError`).
- Resume parsing fails fast with actionable errors (file not found, unsupported format,
  content too short).
- AI calls are wrapped: invalid JSON triggers one self-fix retry, then a fallback to the
  local analyzer. A missing API key never breaks the run.
- Best-effort scrapers (remoteok, generic) catch network errors and return empty lists with
  a warning instead of crashing the pipeline.

## Logging

- Structured step-by-step logs (`[3/12] Analyzing resume...`) make every stage observable.
- `--debug` enables verbose logs.
- Privacy rule: the resume text is never logged; only a sanitized, truncated preview exists
  for debug purposes.

## Test Automation

- **Unit level**: pure functions (skill normalization, role classification, scoring,
  validation, dedup, fallback analysis) tested deterministically with Playwright Test.
- **E2E level**: a real Chromium browser scrapes the sample HTML board, then the entire
  pipeline runs end-to-end and the generated Excel/Markdown/JSON artifacts are opened and
  asserted.
- Config: screenshots only on failure, trace on first retry, video retained on failure —
  the same evidence discipline expected in professional QA work.

## Evidence Generation

Every run produces auditable artifacts: raw scraped data (`jobs-raw.json`), analyzed data
(`jobs-analyzed.json`), match reasoning (`job-matches.json` with explanations) and the QA
Issues sheet. A reviewer can trace any ranking decision back to its inputs.

## Safe Fallback Mode

The local keyword analyzer guarantees identical pipeline behavior with zero external
dependencies. Tests always run in fallback mode, making the suite deterministic and free —
a deliberate testability decision.

## Data Quality Score

Each job receives a 0–100 quality score (100 minus severity-weighted penalties: high −30,
medium −15, low −5). The score is reported per job so low-quality sources are visible at a
glance.

## Duplicate Detection

Jobs are deduplicated by normalized title+company and by normalized URL (tracking parameters
stripped). The sample board intentionally ships one duplicate posting so the behavior is
demonstrable and covered by tests.
