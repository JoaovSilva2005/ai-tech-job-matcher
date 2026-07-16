# Test Cases

The executable suite is under `tests/unit` and `tests/e2e`. This table is a recruiter-friendly traceability sample, not a replacement for the test code.

| ID    | Scenario                                                       | Expected result                                                      |
| ----- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| TC-01 | Parse TXT and Markdown resumes                                 | Correct format and extracted text                                    |
| TC-02 | Parse generated PDF and DOCX resumes                           | Real document text is extracted                                      |
| TC-03 | Upload missing, unsupported, or over-5-MB resume               | JSON 400 with actionable message                                     |
| TC-04 | Extract local fixture board with Chromium                      | At least 16 complete jobs are collected                              |
| TC-05 | Normalize every supported public-source payload                | Common `ScrapedJob` contract                                         |
| TC-06 | Public API returns 503 or exceeds timeout                      | Explicit `SourceUnavailableError`                                    |
| TC-07 | Configure more organizations than a source permits             | Source-specific request cap is enforced                              |
| TC-08 | Every source in `all` fails                                    | Aggregate fails explicitly                                           |
| TC-09 | One aggregate source fails or is unconfigured                  | Other responding sources still contribute                            |
| TC-10 | Configure excessive ATS organizations                          | Per-source request caps are enforced                                 |
| TC-11 | Request Jobicy repeatedly within one hour                      | One public feed request is reused                                    |
| TC-12 | Send Jooble search with API key and location                   | JSON POST preserves headers, body, and candidate location            |
| TC-13 | Parse JSON-LD array or `@graph`                                | Only `JobPosting` objects are normalized                             |
| TC-14 | Configure private, blocked, oversized, or expired JSON-LD page | Page/job is rejected without bypass                                  |
| TC-15 | Source returns closed or expired vacancy                       | High issue, invalid status, excluded from ranking                    |
| TC-16 | Source returns unknown availability or old publication date    | Low issue retained as review evidence                                |
| TC-17 | Duplicate title/company or normalized URL                      | First job kept; duplicate count incremented                          |
| TC-18 | Filter QA/frontend/all roles                                   | Only classified target roles remain                                  |
| TC-19 | Filter remote/hybrid/on-site jobs                              | Every result matches selected work mode                              |
| TC-20 | Provide Campinas as candidate location                         | Same-city/nearby hybrid jobs are prioritized                         |
| TC-21 | Analyze one specific real vacancy                              | Exactly one manual-source match and real apply URL                   |
| TC-22 | Missing API key                                                | Pipeline completes with local fallback recorded                      |
| TC-23 | Provider returns invalid or semantically empty JSON            | Strict schema rejects it and fallback is used                        |
| TC-24 | Provider returns transient failure                             | Bounded retry succeeds or falls back                                 |
| TC-25 | Analyze several jobs through a provider                        | Configured concurrency limit is respected; order preserved           |
| TC-26 | Generate Excel                                                 | Six sheets, filters, frozen headers, clickable job URLs, QA evidence |
| TC-27 | Generate Markdown with application links                       | Valid table and links are produced                                   |
| TC-28 | Persist structured outputs                                     | Four JSON files match pipeline counts                                |
| TC-29 | Inspect output privacy                                         | Email, phone, name, address, and raw resume text are absent          |
| TC-30 | Submit two web analyses concurrently                           | Different run IDs and non-overwritten workbooks                      |
| TC-31 | Download invalid or expired run                                | JSON 404; no cross-directory access                                  |
| TC-32 | Complete browser journey                                       | Upload, analysis, apply link, Excel and Markdown downloads pass      |
| TC-33 | Render at 390 x 844                                            | No horizontal overflow; controls stay inside viewport                |
| TC-34 | Scan form and results with Axe                                 | No serious or critical accessibility violations                      |
| TC-35 | Run specific-job fallback through API                          | Response completes within the 10-second smoke budget                 |
| TC-36 | Compare a junior resume with a senior vacancy                  | Candidate warning is separate; vacancy QA score remains unchanged    |
| TC-37 | Complete an analysis with zero ranked matches                  | Summary, counters, explanation, and both downloads remain visible    |
| TC-38 | Inspect API and report execution summaries                     | Resume filename and local path are absent                            |
| TC-39 | Start the web server with default/invalid bind settings        | Loopback default and validated host/port with defensive headers      |

## Traceability

- Resume and privacy: `parseResume.spec.ts`, `sanitizeResume.spec.ts`, `excelReport.spec.ts`, `webApi.spec.ts`
- AI contracts: `aiSchemas.spec.ts`, `aiHttpClient.spec.ts`, `geminiClient.spec.ts`
- Source contracts: `publicApiUtils.spec.ts`, `publicJobSources.spec.ts`, `extendedPublicJobSources.spec.ts`, `sourceRegistry.spec.ts`, `sourceRequestCaps.spec.ts`, `sourceHealth.spec.ts`
- Matching and QA: `candidateWarnings.spec.ts`, `calculateMatchScore.spec.ts`, `locationPreference.spec.ts`, `validateJob.spec.ts`, `duplicateDetector.spec.ts`
- Pipeline and reports: `fullPipeline.spec.ts`, `excelReport.spec.ts`
- Web API and UI: `webApi.spec.ts`, `webUi.spec.ts`, `webRuns.spec.ts`, `webServerSecurity.spec.ts`
