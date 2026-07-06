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

- The RemoteOK source makes **one** GET request to its public API per run, with a hard cap
  of 15 items and a 15-second timeout.
- The Remotive source makes **one** GET request to its public API per run, keeps at most 20
  items and times out after 15 seconds. Because the free API returns a fixed recent feed and
  ignores filter parameters, role filtering happens locally after the single request — never
  by hitting the API repeatedly.
- The Muse source makes **one** GET request to its public API per run, scoped to the
  Computer and IT category, and keeps at most 20 items.
- The Greenhouse source calls the official public Job Board API for a small list of board
  tokens, keeps at most 20 items, and defaults to a single public example board.
- The Lever source calls the public Postings API only for company slugs explicitly configured
  by the user, keeps at most 20 items, and does not try to discover or crawl slugs.
- There is no crawling, no pagination loops, no parallel request storms, no retry hammering.

## Respect Website Restrictions

- Honest `User-Agent` identifying the tool as a portfolio project.
- Sources are chosen for having explicitly public data (RemoteOK, Remotive, The Muse,
  Greenhouse and Lever expose public job data through documented or public JSON endpoints).
  The report always preserves the original job URL, which links back to the source posting.

## Test Fixture Data

Automated E2E tests use `samples/sample-jobs.html`, a fictional local fixture served from disk. It is not exposed as a CLI or web source; it exists only to keep tests deterministic, offline and free of load on real websites.

## Low Default Limits

`--limit` defaults to 16 and is capped at 100 by CLI validation; real sources apply their own
lower caps (15, 20 or 10 depending on source). The tool is built for personal, low-volume career research — not bulk
harvesting.

## Best-Effort Real Sources

Real sources are intentionally fragile-by-design: any error (network, API change, blocking or missing configuration) results in an empty list and a log warning, never in retries or workarounds.
