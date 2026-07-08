# AI Tech Job Matcher

A TypeScript application that compares a resume against real public tech jobs, ranks the best matches, and generates an Excel report with QA evidence.

The project is focused on practical QA Jr / Dev Jr skills: Playwright automation, automated tests, data validation, responsible public job collection, file processing, and clean TypeScript organization.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-tests%20%2B%20automation-2EAD33?logo=playwright&logoColor=white)
![Tests](https://img.shields.io/badge/tests-92%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does

1. Reads a resume from `.txt`, `.md`, `.pdf`, or `.docx`.
2. Masks personal data before analysis.
3. Collects real jobs from public sources.
4. Validates collected job data.
5. Compares resume and job requirements by skills, seniority, language, and role.
6. Filters by work mode and prioritizes jobs near the candidate's city when provided.
7. Analyzes a specific pasted job description when the user wants to target one opportunity.
8. Ranks job matches by compatibility score, using location preference when provided.
9. Exports an Excel report, Markdown summary, and JSON evidence files.

The app works without an API key by using a local fallback analyzer. Optional AI providers can be configured through environment variables.

## QA Highlights

- Playwright Test coverage for unit and E2E flows.
- Playwright automation used for controlled scraping/test fixtures.
- Data validation for required fields, URLs, descriptions, seniority, work mode, and duplicates.
- Dedicated `QA Issues` sheet in the Excel report.
- Graceful fallback when an external source or AI provider fails.
- Excel, Markdown, and JSON outputs for traceability.
- GitHub Actions CI for build, lint and tests.
- 92 automated tests passing.

## Tech Stack

- Node.js
- TypeScript strict mode
- Playwright and Playwright Test
- ExcelJS
- Express
- Zod
- ESLint
- Prettier
- pdf-parse
- mammoth

## Getting Started

```bash
npm install
npx playwright install chromium
```

Run the CLI with Gupy jobs:

```bash
npm run dev -- -- --resume ./samples/sample-resume.txt --role qa --source gupy --work-mode remote --location "Campinas, SP" --limit 5 --fallback
```

Analyze one specific job description:

```bash
npm run dev -- -- --resume ./samples/sample-resume.txt --role qa --job-file ./tests/fixtures/sample-job-description.txt --job-title "QA Jr" --job-company "Example Co" --job-url "https://jobs.example.com/qa-jr" --fallback
```

Run the web UI:

```bash
npm run web
```

Open:

```text
http://localhost:4180
```

The web UI lets the user upload a resume, choose a target role, select a public job source, filter by work mode, add a city/address preference, paste a specific job description, and download the generated reports. `Gupy Brazil` is selected by default.

## Main Commands

```bash
npm run build
npm run lint
npm test
npm run test:unit
npm run test:e2e
```

Demo shortcuts:

```bash
npm run demo:qa
npm run demo:all
```

Useful CLI filters:

```bash
--work-mode all|remote|hybrid|onsite
--location "Campinas, SP"
--job-file ./job-description.txt
--job-title "Analista de QA Jr"
--job-company "Company name"
--job-url "https://..."
```

## Job Sources

| Source | Type | Requires key? | Notes |
|---|---|---:|---|
| `gupy` | Public Brazilian career pages | No | Default source for CLI and Web UI |
| `remoteok` | Public API | No | Remote jobs |
| `remotive` | Public API | No | Remote jobs |
| `themuse` | Public API | No | International jobs |
| `greenhouse` | Public ATS API | No | Public Greenhouse boards |
| `lever` | Public ATS API | No | Requires public slugs in `LEVER_COMPANY_SLUGS` |
| `all` | Aggregator | No | Queries configured public sources |

Example with Brazilian QA jobs:

```bash
npm run dev -- -- --resume ./samples/sample-resume.txt --role qa --source gupy --work-mode remote --location "Sao Paulo, SP" --limit 8 --fallback
```

## Generated Outputs

Files are saved under `output/`:

```text
output/job-match-report.xlsx
output/execution-summary.md
output/job-matches.json
output/jobs-analyzed.json
output/jobs-raw.json
output/resume-analysis.json
```

The Excel workbook contains six sheets:

- `Ranking`: jobs sorted by match score, or by location preference first when a city/address is provided.
- `Details`: detailed analysis for each job.
- `QA Issues`: data quality issues found during validation.
- `Resume Analysis`: structured candidate profile.
- `Market Insights`: most requested skills across analyzed jobs.
- `Execution Summary`: run metadata and totals.

## Environment Variables

The app runs without `.env`. To configure AI providers or source-specific options, copy `.env.example` to `.env`.

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | `fallback`, `gemini`, `openai`, or `anthropic` |
| `GEMINI_API_KEY` | Optional Gemini key |
| `OPENAI_API_KEY` | Optional OpenAI key |
| `ANTHROPIC_API_KEY` | Optional Anthropic key |
| `GUPY_CAREER_URLS` | Public Gupy career page URLs separated by commas |
| `GREENHOUSE_BOARD_TOKENS` | Public Greenhouse board tokens |
| `LEVER_COMPANY_SLUGS` | Public Lever company slugs |

## Project Structure

```text
src/
  ai/        AI adapters and local fallback
  cli/       argument parsing and validation
  config/    environment configuration
  matcher/   scoring, recommendation, and role classification
  qa/        data quality rules
  reports/   Excel and Markdown generation
  resume/    resume parsing and sanitization
  scraper/   job sources and validation
  web/       Express API and web UI
```

## Privacy and Safety

- Uploaded resumes are deleted after each web analysis.
- Personal data is masked before analysis.
- `.env`, `output/`, and `uploads/` are ignored by Git.
- The app uses public job data only.
- No login bypass, captcha bypass, or aggressive scraping.

## License

MIT
