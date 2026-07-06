# Sample Output Preview

Real output produced by `npm run demo:qa` (sample resume, `--role qa`, fallback mode — no API
key configured).

## Console

```
[1/12] Reading resume: ./samples/sample-resume.txt
INFO  Resume parsed (txt, 2180 chars).
[2/12] Sanitizing personal data (emails, phones, documents)...
[3/12] Analyzing resume with "local-fallback" (AI_PROVIDER=fallback (default))...
[4/12] Collecting jobs from "sample"...
INFO  Collected 10 job(s) from "sample".
[5/12] Validating scraped job data...
[6/12] Removing duplicate jobs...
[7/12] Analyzing 10 job(s) with "local-fallback"...
INFO  4 job(s) match the requested role "qa".
[8/12] Calculating match scores...
[9/12] Ranking jobs by match score...
[10/12] Generating Excel report...
[11/12] Generating Markdown summary...
[12/12] Saving intermediate JSON files...
INFO  Done in 0.3s. Reports saved to ./output
```

## Ranking (Excel "Ranking" sheet, key columns)

| Rank | Score | Recommendation | Job Title | Company | Matched Skills | Critical Gaps |
|------|-------|----------------|-----------|---------|----------------|---------------|
| 1 | 90 | Strong Apply | QA Junior Engineer (Playwright) | BlueOrbit Software | JavaScript, Git, Test Case, Bug Report, Playwright, API Testing, Postman | — |
| 2 | 72 | Apply | Manual QA Analyst | Verdant Systems | Manual Testing, Test Plan, SQL | — |
| 3 | 66 | Study Before Applying | QA Junior Analyst (Cypress) | Nimbus Digital | JavaScript, Test Case, Scrum, SQL | Cypress |
| 4 | 53 | Study Before Applying | QA Automation Engineer (Mid-Level) | Skyline Fintech | TypeScript, JavaScript, Playwright, Git | Selenium |

## Explanation example (from `job-matches.json`)

> "Strong match because the candidate already has JavaScript, Git, Test Case and Bug Report
> and meets the English requirement."

## Generated files

```
output/
├── job-match-report.xlsx    # 6-sheet Excel report
├── execution-summary.md     # human-readable run summary
├── jobs-raw.json            # every scraped job, untouched
├── jobs-analyzed.json       # validation + structured analysis per job
├── resume-analysis.json     # candidate profile (sanitized, no contact data)
└── job-matches.json         # ranked matches with scores and explanations
```
