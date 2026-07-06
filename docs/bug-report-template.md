# Bug Report Template

> Copy this template when reporting a defect in AI Tech Job Matcher (or use it as a portfolio
> example of professional bug reporting).

## Bug ID

`BUG-YYYY-NNN` (e.g. `BUG-2026-001`)

## Title

Short, specific and searchable. Good: "Ranking sheet shows score 0 for jobs with empty
requiredSkills". Bad: "Excel broken".

## Severity

- **Critical** — pipeline crashes, data loss, wrong report silently generated
- **High** — main feature incorrect (wrong scores, missing jobs, corrupted Excel)
- **Medium** — feature partially incorrect with workaround (formatting, ordering)
- **Low** — cosmetic issue, typo, minor log noise

## Priority

- **P1** — fix before any release
- **P2** — fix in current sprint
- **P3** — backlog

## Environment

- OS + version:
- Node.js version:
- Project version / commit hash:
- AI provider (`fallback` / `openai` / `anthropic` / `gemini`):
- Command used (full CLI line):

## Steps to Reproduce

1. …
2. …
3. …

## Expected Result

What should have happened, referencing docs or acceptance criteria when possible.

## Actual Result

What actually happened. Include exact error messages and relevant log lines.

## Evidence

- Console output (trimmed to relevant lines)
- Generated files (`output/*.json`, `output/*.xlsx`)
- Playwright trace/screenshot/video when the failure comes from a test
  (`test-results/`, `playwright-report/`)

## Status

`New` → `Triaged` → `In Progress` → `Fixed` → `Verified` → `Closed`
(or `Rejected` / `Duplicate` with justification)
