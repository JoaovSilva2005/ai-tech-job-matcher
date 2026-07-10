# Public Data Collection Policy

This project demonstrates job-data collection without authentication bypass, captcha circumvention, or high-volume crawling.

## Allowed Sources

Only vacancies available without an account are collected:

- RemoteOK and Remotive public feeds.
- The Muse public API.
- Greenhouse public Job Board API.
- Lever public Postings API for explicitly configured company slugs.
- Public Gupy career pages explicitly configured by URL.

LinkedIn, Indeed, Catho, InfoJobs, and Glassdoor are intentionally not scraped. Their access controls and terms make them inappropriate for this portfolio implementation without a formal partnership or approved API.

## Request Limits

| Source     | Per-run behavior                                              |
| ---------- | ------------------------------------------------------------- |
| RemoteOK   | One request; keep at most 15 jobs                             |
| Remotive   | One request; keep at most 20 jobs                             |
| The Muse   | First public Computer and IT page; keep at most 20 jobs       |
| Greenhouse | At most five configured boards; keep at most 20 jobs total    |
| Lever      | At most five configured companies; keep at most 20 jobs total |
| Gupy       | At most three career pages; keep at most 12 jobs total        |

The `all` source runs one bounded fan-out and interleaves results. It does not poll continuously or paginate through entire catalogs.

## Network Conduct

- Honest user agent identifies the repository as a low-volume portfolio project.
- Shared 15-second source request timeout.
- No source-request retry loop.
- No login, cookie reuse, captcha solving, proxy rotation, or access-control bypass.
- Original source/application URLs remain in every report.

## Failure Semantics

A network error, timeout, non-2xx response, or invalid payload is reported as source failure. A successful feed with no matching jobs is reported as empty. The aggregate isolates an individual outage but fails if every configured source is unavailable.

`npm run sources:check` records `ok`, `empty`, `unconfigured`, and `failed` states in `output/source-health.json`. A weekly GitHub Actions workflow keeps that operational check separate from deterministic CI.

## Test Data

Automated browser scraping uses `samples/sample-jobs.html`, a fictional local fixture. It creates no traffic to third-party sites and includes an intentional duplicate for QA coverage.

## Intended Use

The tool is designed for personal, low-volume career research. It is not a bulk data harvester, job-board mirror, or commercial redistribution system. Source terms and robots policies should be reviewed again before adding any integration or increasing request volume.
