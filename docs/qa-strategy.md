# QA Strategy

The project treats resumes, external APIs, AI responses, and generated files as untrusted boundaries. Quality decisions are explicit and testable.

## Data Quality Gate

Every job is checked before ranking:

| Rule                                                | Severity |
| --------------------------------------------------- | -------- |
| Missing title or company                            | High     |
| Invalid application URL                             | High     |
| Closed or expired posting                           | High     |
| Description under 100 characters                    | Medium   |
| Generic description under 180 characters            | Low      |
| Unknown work mode or availability                   | Low      |
| Invalid collection/publication/expiration timestamp | Low      |
| Publication older than 180 days                     | Low      |

High-severity issues make a job `invalid` and exclude it from ranking. Medium issues produce `needs_review`. Every issue remains visible in JSON, the web UI, and the Excel `QA Issues` sheet.

Data quality starts at 100 and subtracts 30, 15, or 5 points for high, medium, or low issues. This score measures source-data confidence, not candidate compatibility.

## Automated Test Layers

| Layer            | Evidence                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Unit             | Parsing, schemas, sanitization, matching, validation, source mappers, request caps       |
| Integration      | Complete pipeline, fallback behavior, role/work-mode/location filters, artifacts         |
| API              | Upload validation, report downloads, invalid selectors, run isolation, basic time budget |
| Browser E2E      | Real upload and specific-job journey, application link, Excel/Markdown downloads         |
| Accessibility    | Axe checks for serious/critical violations on form and results                           |
| Responsive       | Mobile viewport assertions and horizontal-overflow check at 390 x 844                    |
| Live diagnostics | Scheduled public-source health workflow outside the deterministic CI suite               |

Playwright retains screenshots and video on failure and a trace on the first retry. GitHub Actions uploads those artifacts when CI fails.

The current suite contains 160 tests. New source coverage includes payload mappers, POST/header handling, configuration states, request caps, cache behavior, JSON-LD parsing, expiration, and authorized-page safety controls.

## Failure Handling

- CLI and web inputs fail with actionable 4xx messages.
- Unsupported, oversized, too-short, or too-large resume content is rejected.
- PDF and DOCX extraction use real generated documents in automated tests.
- Source HTTP errors and timeouts remain distinguishable from an empty feed.
- One source failure does not abort `all`; total source failure does.
- AI calls have bounded timeout, retry, backoff, and concurrency.
- Invalid provider output is never trusted; local fallback keeps the flow available.

## Determinism

The main suite requires no API key and no live third-party source. HTTP providers are mocked, and the Playwright scraper runs against a local HTML board containing realistic jobs and an intentional duplicate. Live integrations are checked separately so CI failures represent product regressions rather than internet instability.

## Privacy Assertions

Tests verify that direct identifiers do not appear in structured analysis or Excel output, uploaded files are removed, concurrent runs stay isolated, and expired report directories are cleaned without deleting unrelated files.
