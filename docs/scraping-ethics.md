# Scraping Ethics — AI Tech Job Matcher

This project demonstrates web automation skills **without** crossing ethical or legal lines.
These are the rules the codebase follows by design.

## Only Public Data

Only publicly accessible job postings are collected — pages or APIs anyone can open in a
browser without an account. Job postings are meant to be discovered; we only read what is
already public.

## No Login Bypass

None of the scrapers authenticate, reuse cookies/sessions, or access content behind a login
wall. Sites that require login are simply out of scope.

## No Captcha Bypass

If a source presents a captcha or bot challenge, the scraper does not attempt to solve,
outsource or circumvent it. The run fails gracefully and moves on.

## No Aggressive Requests

- The default demo source (`sample`) makes **zero** network requests.
- The RemoteOK source makes **one** GET request to its public API per run, with a hard cap
  of 15 items and a 15-second timeout.
- The Remotive source makes **one** GET request to its public API per run, keeps at most 20
  items and times out after 15 seconds. Because the free API returns a fixed recent feed and
  ignores filter parameters, role filtering happens locally after the single request — never
  by hitting the API repeatedly.
- The generic source loads **one** page with a cap of 10 items.
- There is no crawling, no pagination loops, no parallel request storms, no retry hammering.

## Respect Website Restrictions

- Honest `User-Agent` identifying the tool as a portfolio project.
- Sources are chosen for having explicitly public data (RemoteOK and Remotive both publish
  public APIs and ask for attribution — the report always preserves the original job URL,
  which links back).
- If a site's terms or robots directives disallow automated access, it is not a valid target
  for the generic source. The README states this requirement for `GENERIC_JOBS_URL`.

## Sample Data for Demo Stability

The primary demo runs against `samples/sample-jobs.html` — 16 fictional postings served from
disk. This keeps demos deterministic, offline and free of any load on real websites, while
still exercising a real Playwright browser end-to-end.

## Low Default Limits

`--limit` defaults to 16 and is capped at 100 by CLI validation; real sources apply their own
lower caps (15 and 10). The tool is built for personal, low-volume career research — not bulk
harvesting.

## Best-Effort Real Sources

Real sources are intentionally fragile-by-design: any error (network, markup change, blocking)
results in an empty list and a log warning, never in retries or workarounds. Reliability comes
from the sample source; realism comes from the architecture being identical for all sources.
