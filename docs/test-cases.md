# Test Cases — AI Tech Job Matcher

Automated coverage lives in `tests/unit` and `tests/e2e`. Each case below maps to at least one
automated test (or is verifiable via CLI as noted).

| ID | Title | Steps | Expected Result |
|----|-------|-------|-----------------|
| TC-01 | Valid TXT resume | Run pipeline with `--resume samples/sample-resume.txt` | Resume is parsed; skills, seniority and English level are detected |
| TC-02 | Invalid resume path | Run pipeline with `--resume ./does-not-exist.txt` | Clear error "Resume file not found"; exit code 1; no crash |
| TC-03 | Unsupported resume format | Run pipeline with a `.png` file as resume | Error listing supported formats (.txt, .md, .pdf, .docx) |
| TC-04 | Scrape jobs from sample source | Run with `--source sample --limit 50` | ≥16 jobs extracted, all with title, company, URL, work mode, description ≥100 chars |
| TC-05 | Filter QA jobs | Run with `--role qa` | Ranking contains only jobs classified as `qa` |
| TC-06 | Filter frontend jobs | Run with `--role frontend` | Ranking contains only jobs classified as `frontend` |
| TC-07 | Role `all` returns mixed jobs | Run with `--role all` | Ranking contains ≥4 different roles |
| TC-08 | Remove duplicate jobs | Scrape sample board (contains intentional duplicate tb-017) | `duplicatesRemoved ≥ 1`; no repeated title+company pair in ranking |
| TC-09 | Validate required job fields | Feed fixture jobs with empty title / invalid URL (`tests/fixtures/sample-jobs.json`) | High severity issues on `title`/`url`; job status `invalid`; excluded from ranking |
| TC-10 | Generate fallback resume analysis | Analyze sample resume with no API key | `fallbackMode: true`; JavaScript/TypeScript/Git/SQL/Playwright detected; English `advanced` |
| TC-11 | Generate fallback job analysis | Analyze QA Playwright fixture job with no API key | Role `qa`, seniority `junior`, Playwright in automationTools, `testingRequired: true` |
| TC-12 | Calculate match score | Score junior QA resume against junior QA job and against senior job | Scores in 0..100; junior job scores higher; senior job penalized below 50 |
| TC-13 | Generate Excel report | Run full pipeline | `job-match-report.xlsx` with 6 sheets (Ranking, Details, QA Issues, Resume Analysis, Market Insights, Execution Summary); ranking sorted desc; frozen header; autofilter |
| TC-14 | Handle missing API key | Set `AI_PROVIDER=openai` with empty key (or default env) | Pipeline completes using local fallback; summary reports fallback mode |
| TC-15 | Description too short flags review | Feed fixture job with 18-char description | Medium severity issue; status `needs_review` |
| TC-16 | Markdown summary generation | Run full pipeline | `execution-summary.md` with Top 5, skills, gaps, study plan and QA notes |
| TC-17 | Intermediate JSONs generation | Run full pipeline | `jobs-raw.json`, `jobs-analyzed.json`, `resume-analysis.json`, `job-matches.json` created and consistent |
| TC-18 | Privacy: no PII in outputs | Run pipeline with resume containing email/phone | Sanitized values never appear in Excel, Markdown or JSON outputs |

Traceability: TC-01/10 → `fallbackAnalyzer.spec.ts`; TC-04/08 → `sampleScraper.spec.ts`;
TC-05/06/07/08/09/14/16/17 → `fullPipeline.spec.ts`; TC-09/15 → `validateJob.spec.ts`;
TC-12 → `calculateMatchScore.spec.ts`; TC-13/18 → `excelReport.spec.ts`;
TC-02/03 → manual CLI verification (error paths also covered by `parseResume` unit behavior).
