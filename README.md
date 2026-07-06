# AI Tech Job Matcher

> A Playwright-powered tool that scrapes public tech job opportunities, analyzes resumes with
> AI, and generates Excel reports ranking the best job matches.

**This project demonstrates how Playwright can be used not only for browser testing, but also
for reliable web automation, data validation, AI-assisted analysis and career-oriented
reporting.**

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-scraping%20%2B%20testing-2EAD33?logo=playwright&logoColor=white)
![Tests](https://img.shields.io/badge/tests-59%20passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

## Problem Solved

Junior tech candidates waste hours reading job posts that don't fit their profile — and when
a post *does* fit, they rarely know which skill gaps to close first. This tool automates that
research: give it your resume and a target area, and it returns a ranked Excel report showing
which jobs to apply to, which skills you already match, which ones you're missing and what to
study before applying.

## Features

- 🎭 **Playwright scraping** of a deterministic local job board (16 realistic fictional jobs) plus best-effort real sources (RemoteOK, Remotive)
- 📄 **Resume parsing** for TXT, PDF and DOCX files
- 🔒 **PII sanitization** — emails, phones and documents are masked before analysis and never persisted
- 🤖 **Flexible AI layer** — OpenAI or Anthropic via adapter, with a local keyword fallback that requires **no API key**
- ✅ **QA validation gate** — severity-ranked issues, data quality scores, duplicate removal
- 🧮 **Hybrid match scoring (0–100)** with recommendations, explanations and per-job study plans
- 📊 **Professional Excel report** (6 sheets, ExcelJS) + Markdown summary + 4 JSON artifacts
- 🧪 **59 automated tests** (unit + E2E) with Playwright Test
- 🌐 **Optional no-build web UI** for uploading a resume and downloading the generated report

## Tech Stack

Node.js · TypeScript (strict) · Playwright · Playwright Test · ExcelJS · Zod · dotenv ·
pdf-parse · mammoth · ESLint · Prettier

## Architecture Overview

```
src/
├── cli/        argument parsing and validation
├── config/     environment loading (Zod-validated)
├── resume/     parse (TXT/PDF/DOCX) → sanitize PII → analyze
├── scraper/    source registry + Playwright scrapers + selectors + validation facade
├── ai/         AiClient adapter (openai | anthropic | fallback), prompts, JSON repair
├── matcher/    skill normalization, role classification, match scoring, recommendations
├── qa/         validation rules, duplicate detector, data quality score
├── reports/    Excel workbook (6 sheets), Markdown summary
└── utils/      logger, fs, date, text, url helpers
```

See [docs/architecture.md](docs/architecture.md) for the full data-flow diagram.

## How It Works

1. Reads and parses your resume, then **sanitizes personal data** (emails, phones).
2. Analyzes the resume (AI or local fallback): skills, seniority, languages, target roles.
3. Scrapes jobs with Playwright from the selected source.
4. **Validates every job** (QA gate) and removes duplicates.
5. Analyzes each job into structured data (required skills, seniority, English, red flags…).
6. Scores each job against your profile (0–100) and assigns a recommendation.
7. Generates `output/job-match-report.xlsx`, `output/execution-summary.md` and four JSON files.

## How to Install

```bash
git clone https://github.com/<your-user>/ai-tech-job-matcher.git
cd ai-tech-job-matcher
npm install
npx playwright install chromium
```

No further setup needed — the tool works out of the box with no API key (fallback mode).

## How to Run

```bash
# QA jobs demo (offline, no API key needed)
npm run demo:qa

# All roles demo
npm run demo:all

# Custom runs
npm run dev -- --resume ./samples/sample-resume.txt --role qa --source sample --limit 10
npm run dev -- --resume ./samples/sample-resume.txt --role frontend --source sample --limit 10
npm run dev -- --resume ./samples/sample-resume.txt --role all --source sample --limit 20
npm run dev -- --resume ./my-resume.pdf --role backend --source remoteok --limit 10
```

## Optional Web UI

```bash
npm run web
```

Open `http://localhost:4180`, upload a `.txt`, `.md`, `.pdf` or `.docx` resume, and download
the generated Excel/Markdown reports. The uploaded resume is deleted from disk after each run.

## CLI Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--resume` | file path (.txt/.md/.pdf/.docx) | **required** | Resume to analyze |
| `--role` | `qa` `frontend` `backend` `fullstack` `mobile` `data` `devops` `support` `internship` `all` | `all` | Target tech area |
| `--source` | `sample` `remoteok` `remotive` `generic` | `sample` | Job source (`sample` is offline and deterministic; `remoteok`/`remotive` are real public APIs) |
| `--limit` | 1–100 | `16` | Max jobs to collect |
| `--output` | directory path | `./output` | Output folder |
| `--fallback` | flag | off | Force local analysis (skip AI even if a key exists) |
| `--debug` | flag | off | Verbose logging |

## Job Sources

| Source | Type | Auth | Notes |
|--------|------|------|-------|
| `sample` | Local HTML (Playwright, `file://`) | — | **Default.** Offline, deterministic, 16 fictional jobs. Best for demos and tests. |
| `remotive` | Public JSON API | None | Real remote jobs. The free feed returns the ~30 most recent postings across all categories, so the app filters it **client-side** by `--role`. |
| `remoteok` | Public JSON API | None | Real remote jobs (single request, capped at 15). |
| `generic` | Any public page (Playwright) | None | Best-effort scraper for the URL in `GENERIC_JOBS_URL`; public, no login/captcha. |

```bash
# Real remote jobs from Remotive, filtered to QA by the app
npm run dev -- --resume ./samples/sample-resume.txt --role qa --source remotive --limit 10

# Whole recent feed, ranked against your resume
npm run dev -- --resume ./samples/sample-resume.txt --role all --source remotive --limit 20
```

> **Why client-side filtering for Remotive?** Their free public API ignores the
> `category`/`search`/`limit` query parameters and always returns a fixed recent feed.
> Rather than pretend otherwise, the app fetches that feed and classifies every job with its
> own `classifyRole` engine — which is exactly the "turn a messy feed into a useful ranking"
> value the project is built to demonstrate. If the current feed has no jobs for your role,
> the source reports it clearly instead of returning noise.

## Environment Variables

Copy `.env.example` to `.env` (optional — everything works without it):

| Variable | Description |
|----------|-------------|
| `AI_PROVIDER` | `fallback` (default), `openai` or `anthropic` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Provider keys (missing key ⇒ automatic fallback) |
| `OPENAI_MODEL` / `ANTHROPIC_MODEL` | Optional model overrides |
| `GENERIC_JOBS_URL` | Public job board URL for the best-effort `generic` source |

## Example Output

```
[1/12] Reading resume: ./samples/sample-resume.txt
[3/12] Analyzing resume with "local-fallback" (AI_PROVIDER=fallback (default))...
[4/12] Collecting jobs from "sample"...
[7/12] Analyzing 16 job(s) with "local-fallback"...
[10/12] Generating Excel report...
Done in 0.4s. Reports saved to ./output
```

Top of a real generated ranking (sample resume, `--role qa`):

| # | Score | Recommendation | Job | Company |
|---|-------|----------------|-----|---------|
| 1 | 90 | Strong Apply | QA Junior Engineer (Playwright) | BlueOrbit Software |
| 2 | 72 | Apply | Manual QA Analyst | Verdant Systems |
| 3 | 66 | Study Before Applying | QA Junior Analyst (Cypress) | Nimbus Digital |
| 4 | 53 | Study Before Applying | QA Automation Engineer (Mid-Level) | Skyline Fintech |

See [samples/sample-output-preview.md](samples/sample-output-preview.md) for more.

## Excel Report Structure

`output/job-match-report.xlsx` contains six sheets:

1. **Ranking** — one row per job, sorted by score, color-coded recommendation, matched /
   missing skills, critical gaps, job URL. Frozen header + autofilter.
2. **Details** — summaries, required vs nice-to-have skills, tools, red flags, study topics
   and the score explanation per job.
3. **QA Issues** — every data quality issue found (field, severity, message, quality score).
4. **Resume Analysis** — the candidate's structured profile (no personal contact data).
5. **Market Insights** — skill demand counts across the analyzed jobs.
6. **Execution Summary** — run metadata (source, counts, fallback mode, duration).

## QA Validations

- Title/company must not be empty; URL must be valid (high severity ⇒ job excluded).
- Description ≥100 chars; short/generic descriptions are flagged.
- Work mode normalized to remote/hybrid/onsite.
- Duplicates removed by normalized title+company and URL.
- Seniority above the candidate's profile generates a warning.
- Every job gets a 0–100 data quality score.

Details in [docs/qa-strategy.md](docs/qa-strategy.md).

## Testing Strategy

```bash
npm test          # all 59 tests
npm run test:unit # pure-logic tests
npm run test:e2e  # browser scraping + full pipeline + Excel validation
```

Unit tests cover skill normalization, role classification, scoring, validation, duplicate
detection and the fallback analyzer. E2E tests scrape the sample board with a real Chromium
browser, run the entire pipeline and open the generated Excel to assert sheets, sorting and
privacy guarantees. Evidence on failure: screenshot, trace and video.
Docs: [test plan](docs/test-plan.md) · [test cases](docs/test-cases.md) ·
[bug report template](docs/bug-report-template.md).

## Ethical Scraping Notes

Only public data; no login bypass; no captcha solving; no aggressive requests (the demo
source is a local file with **zero** network calls; real sources are single-request,
low-limit and best-effort). Full policy: [docs/scraping-ethics.md](docs/scraping-ethics.md).

## Privacy Notes

Resumes contain personal data, so the tool: masks emails/phones/documents **before** any
analysis or AI call; never logs the resume text; never copies the resume into `output/`;
persists only the structured skill analysis. `.env`, `output/` and `uploads/` are
git-ignored. All sample data is fictional.

## How this project relates to QA Automation

- **Web automation with Playwright** — real browser scraping with locators and dedicated selector files.
- **Data validation** — severity-ranked rules gate every scraped record.
- **Test planning** — documented test plan, 18 test cases and traceability to automated tests.
- **Bug reporting mindset** — QA Issues sheet + professional bug report template.
- **Evidence generation** — JSON artifacts, traces, screenshots and videos on failure.
- **Report generation** — recruiter-ready Excel output.
- **Automated tests** — 59 unit + E2E tests with Playwright Test.

## How this project relates to Software Development

- **TypeScript architecture** — strict typing, typed boundaries between modules.
- **Modular design** — adapter (AI providers), registry (scraper sources), facade (validation).
- **CLI pipeline** — 12 observable steps with validated arguments.
- **AI integration** — provider-agnostic clients, defensive JSON parsing, schema validation.
- **File processing** — TXT/PDF/DOCX parsing, Excel and Markdown generation.
- **Error handling** — graceful degradation at every external boundary.
- **Clean code** — ESLint + Prettier, small focused modules, no hidden state.

## Why this project is not limited to QA

The matcher supports **multiple tech roles**: it classifies and ranks QA, frontend, backend,
full stack, mobile, data, devops and support jobs (plus internships). QA Automation is the
strongest showcase — Playwright drives both the scraping and the tests — but the same
pipeline serves any junior tech career search.

## Future Improvements

- Add screenshots or a short GIF of the CLI, web UI and Excel report
- Upgrade the simple web UI into a richer React/Vite interface if the project needs a larger frontend showcase
- More real job sources behind the same interface
- Semantic (embedding-based) matching in fallback mode
- Weekly scheduled runs with skill-demand trend charts
- GitHub Actions CI publishing the Playwright HTML report

## Author

**Joao Victor Silva** — aspiring QA Automation Engineer / Junior Developer.
Feel free to open an issue or reach out on LinkedIn.

## Interview Talking Points

Preparing to present this project? Read
[docs/interview-talking-points.md](docs/interview-talking-points.md) — it includes a
60-second pitch, a short pitch and answers about the architecture, the scoring model and the
QA strategy.

## License

MIT
