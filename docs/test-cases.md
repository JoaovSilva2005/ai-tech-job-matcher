# Test Cases

The executable suite is under `tests/unit` and `tests/e2e`. This table is a recruiter-friendly traceability sample, not a replacement for the test code.

| ID    | Scenario                                                    | Expected result                                                      |
| ----- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| TC-01 | Parse TXT and Markdown resumes                              | Correct format and extracted text                                    |
| TC-02 | Parse generated PDF and DOCX resumes                        | Real document text is extracted                                      |
| TC-03 | Upload missing, unsupported, or over-5-MB resume            | JSON 400 with actionable message                                     |
| TC-04 | Extract local fixture board with Chromium                   | At least 16 complete jobs are collected                              |
| TC-05 | Normalize The Muse, Greenhouse, Lever, and Gupy payloads    | Common `ScrapedJob` contract                                         |
| TC-06 | Public API returns 503 or exceeds timeout                   | Explicit `SourceUnavailableError`                                    |
| TC-07 | Configure more than five Greenhouse/Lever organizations     | At most five requests per source                                     |
| TC-08 | Every source in `all` fails                                 | Aggregate fails explicitly                                           |
| TC-09 | One aggregate source fails or is unconfigured               | Other responding sources still contribute                            |
| TC-10 | Source returns closed or expired vacancy                    | High issue, invalid status, excluded from ranking                    |
| TC-11 | Source returns unknown availability or old publication date | Low issue retained as review evidence                                |
| TC-12 | Duplicate title/company or normalized URL                   | First job kept; duplicate count incremented                          |
| TC-13 | Filter QA/frontend/all roles                                | Only classified target roles remain                                  |
| TC-14 | Filter remote/hybrid/on-site jobs                           | Every result matches selected work mode                              |
| TC-15 | Provide Campinas as candidate location                      | Same-city/nearby hybrid jobs are prioritized                         |
| TC-16 | Analyze one specific real vacancy                           | Exactly one manual-source match and real apply URL                   |
| TC-17 | Missing API key                                             | Pipeline completes with local fallback recorded                      |
| TC-18 | Provider returns invalid or semantically empty JSON         | Strict schema rejects it and fallback is used                        |
| TC-19 | Provider returns transient failure                          | Bounded retry succeeds or falls back                                 |
| TC-20 | Analyze several jobs through a provider                     | Configured concurrency limit is respected; order preserved           |
| TC-21 | Generate Excel                                              | Six sheets, filters, frozen headers, clickable job URLs, QA evidence |
| TC-22 | Generate Markdown with application links                    | Valid table and links are produced                                   |
| TC-23 | Persist structured outputs                                  | Four JSON files match pipeline counts                                |
| TC-24 | Inspect output privacy                                      | Email, phone, name, address, and raw resume text are absent          |
| TC-25 | Submit two web analyses concurrently                        | Different run IDs and non-overwritten workbooks                      |
| TC-26 | Download invalid or expired run                             | JSON 404; no cross-directory access                                  |
| TC-27 | Complete browser journey                                    | Upload, analysis, apply link, Excel and Markdown downloads pass      |
| TC-28 | Render at 390 x 844                                         | No horizontal overflow; controls stay inside viewport                |
| TC-29 | Scan form and results with Axe                              | No serious or critical accessibility violations                      |
| TC-30 | Run specific-job fallback through API                       | Response completes within the 10-second smoke budget                 |

## Traceability

- Resume and privacy: `parseResume.spec.ts`, `sanitizeResume.spec.ts`, `excelReport.spec.ts`
- AI contracts: `aiSchemas.spec.ts`, `aiHttpClient.spec.ts`, `geminiClient.spec.ts`
- Source contracts: `publicApiUtils.spec.ts`, `publicJobSources.spec.ts`, `sourceRequestCaps.spec.ts`, `sourceHealth.spec.ts`
- Matching and QA: `calculateMatchScore.spec.ts`, `locationPreference.spec.ts`, `validateJob.spec.ts`, `duplicateDetector.spec.ts`
- Pipeline and reports: `fullPipeline.spec.ts`, `excelReport.spec.ts`
- Web API and UI: `webApi.spec.ts`, `webUi.spec.ts`, `webRuns.spec.ts`
