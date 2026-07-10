import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { getEnv } from '../../config/env';
import { nowIso } from '../../utils/date';
import { logger } from '../../utils/logger';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { SourceUnavailableError } from '../sourceErrors';
import { matchesRequestedRole } from '../sourceFilters';
import type { ScrapedJob, ScrapeOptions, WorkMode } from '../types';
import { fetchPublicText, parseCommaList, PUBLIC_SOURCE_USER_AGENT } from './publicApiUtils';

const MAX_JSONLD_PAGES = 5;
const MAX_JSONLD_HTML_BYTES = 2_000_000;

interface JsonLdJobPosting {
  '@type'?: string | string[];
  '@id'?: string;
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string | string[];
  jobLocationType?: string | string[];
  url?: string;
  identifier?: string | { name?: string; value?: string };
  hiringOrganization?: { name?: string };
  jobLocation?: JsonLdPlace | JsonLdPlace[];
  applicantLocationRequirements?: JsonLdPlace | JsonLdPlace[];
}

interface JsonLdPlace {
  name?: string;
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string | { name?: string };
  };
}

export async function scrapeJsonLdJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const configuredUrls = parseCommaList(getEnv().JSONLD_JOB_URLS);
  const urls = configuredUrls.slice(0, MAX_JSONLD_PAGES);
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];
  let successfulPages = 0;
  let lastError: Error | undefined;

  if (configuredUrls.length > MAX_JSONLD_PAGES) {
    logger.warn(`JSON-LD: using only the first ${MAX_JSONLD_PAGES} configured job pages.`);
  }

  for (const pageUrl of urls) {
    if (!isSafePublicUrl(pageUrl)) {
      logger.warn(`JSON-LD: ignored unsafe or invalid URL "${pageUrl}".`);
      continue;
    }

    try {
      if (!(await isAllowedByRobots(pageUrl))) {
        logger.warn(
          `JSON-LD: robots.txt does not allow collection from ${new URL(pageUrl).hostname}.`
        );
        continue;
      }
      const html = await fetchPublicText(pageUrl, `JSON-LD (${new URL(pageUrl).hostname})`);
      if (Buffer.byteLength(html, 'utf8') > MAX_JSONLD_HTML_BYTES) {
        logger.warn(`JSON-LD: ignored page larger than ${MAX_JSONLD_HTML_BYTES} bytes.`);
        continue;
      }
      successfulPages += 1;

      for (const [index, posting] of parseJobPostingJsonLd(html).entries()) {
        const job = mapJsonLdJob(posting, pageUrl, scrapedAt, index);
        if (!job || !matchesRequestedRole(options.role, job.title, job.description)) continue;
        jobs.push(job);
        if (jobs.length >= options.limit) break;
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(lastError.message);
    }
    if (jobs.length >= options.limit) break;
  }

  if (successfulPages === 0 && lastError) throw lastError;
  if (jobs.length > 0) logger.info(`JSON-LD: collected ${jobs.length} authorized job page(s).`);
  else logger.warn('JSON-LD: no active matching JobPosting objects found.');
  return jobs;
}

export function parseJobPostingJsonLd(html: string): JsonLdJobPosting[] {
  const $ = load(html);
  const postings: JsonLdJobPosting[] = [];

  $('script[type="application/ld+json"]').each((_index, element) => {
    const raw = ($(element).html() ?? '')
      .trim()
      .replace(/^<!--|-->$/g, '')
      .trim();
    if (!raw) return;
    try {
      collectJobPostings(JSON.parse(raw) as unknown, postings);
    } catch {
      // One invalid structured-data block must not hide valid blocks on the same page.
    }
  });

  return postings;
}

export function mapJsonLdJob(
  posting: JsonLdJobPosting,
  pageUrl: string,
  scrapedAt: string,
  index = 0
): ScrapedJob | null {
  const expiresAt = normalizeDate(posting.validThrough);
  if (expiresAt && Date.parse(expiresAt) < Date.now()) return null;

  const title = normalizeWhitespace(posting.title ?? '');
  const company = normalizeWhitespace(posting.hiringOrganization?.name ?? '');
  const description = normalizeWhitespace(stripHtml(posting.description ?? '')).slice(0, 4000);
  const url = resolveJobUrl(posting.url, pageUrl);
  if (!title || !company || !url || description.length < 60) return null;

  const location = formatJsonLdLocations(
    posting.jobLocation,
    posting.applicantLocationRequirements
  );
  const employment = Array.isArray(posting.employmentType)
    ? posting.employmentType.join(', ')
    : posting.employmentType;

  return {
    id: `jsonld-${jobIdentifier(posting, pageUrl, index)}`,
    title,
    company,
    location: location || 'Not specified',
    workMode: jsonLdWorkMode(posting, description),
    url,
    description: normalizeWhitespace(
      `Source: authorized JSON-LD JobPosting page. Employment: ${employment || 'not specified'}. ${description}`
    ),
    source: 'jsonld',
    scrapedAt,
    publishedAt: normalizeDate(posting.datePosted),
    expiresAt,
    availability: expiresAt ? 'active' : 'unknown',
  };
}

function collectJobPostings(value: unknown, output: JsonLdJobPosting[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJobPostings(item, output);
    return;
  }
  if (!value || typeof value !== 'object') return;

  const object = value as Record<string, unknown>;
  const types = Array.isArray(object['@type']) ? object['@type'] : [object['@type']];
  if (types.some((type) => String(type).toLowerCase() === 'jobposting')) {
    output.push(object as JsonLdJobPosting);
  }
  if (object['@graph']) collectJobPostings(object['@graph'], output);
}

async function isAllowedByRobots(pageUrl: string): Promise<boolean> {
  const url = new URL(pageUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  let contents = '';
  try {
    contents = await fetchPublicText(robotsUrl, `robots.txt (${url.hostname})`, 8_000);
  } catch (error) {
    if (error instanceof SourceUnavailableError && error.status === 404) return true;
    throw error;
  }
  const robots = robotsParser(robotsUrl, contents);
  return robots.isAllowed(pageUrl, PUBLIC_SOURCE_USER_AGENT) !== false;
}

function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local')) return false;
    if (isIP(hostname) === 4 && isPrivateIpv4(hostname)) return false;
    if (
      isIP(hostname) === 6 &&
      (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd'))
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isPrivateIpv4(hostname: string): boolean {
  const [a, b] = hostname.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function resolveJobUrl(value: string | undefined, pageUrl: string): string {
  try {
    const resolvedUrl = new URL(value || pageUrl, pageUrl).toString();
    return isSafePublicUrl(resolvedUrl) ? resolvedUrl : '';
  } catch {
    return '';
  }
}

function formatJsonLdLocations(
  jobLocations: JsonLdPlace | JsonLdPlace[] | undefined,
  applicantLocations: JsonLdPlace | JsonLdPlace[] | undefined
): string {
  const places = [jobLocations, applicantLocations]
    .flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []))
    .map((place) => {
      const country =
        typeof place.address?.addressCountry === 'string'
          ? place.address.addressCountry
          : place.address?.addressCountry?.name;
      return [place.name, place.address?.addressLocality, place.address?.addressRegion, country]
        .map((part) => normalizeWhitespace(part ?? ''))
        .filter(Boolean)
        .join(', ');
    })
    .filter(Boolean);
  return [...new Set(places)].join(' | ');
}

function jsonLdWorkMode(posting: JsonLdJobPosting, description: string): WorkMode {
  const inferred = normalizeWorkMode(`${posting.title ?? ''} ${description}`);
  if (inferred === 'hybrid') return 'hybrid';
  const values = Array.isArray(posting.jobLocationType)
    ? posting.jobLocationType
    : [posting.jobLocationType];
  if (values.some((value) => String(value).toUpperCase().includes('TELECOMMUTE'))) return 'remote';
  if (inferred !== 'unknown') return inferred;
  return posting.jobLocation ? 'onsite' : 'unknown';
}

function jobIdentifier(posting: JsonLdJobPosting, pageUrl: string, index: number): string {
  const identifier =
    typeof posting.identifier === 'string'
      ? posting.identifier
      : posting.identifier?.value || posting.identifier?.name;
  const source = identifier || posting['@id'] || `${pageUrl}:${posting.title ?? ''}:${index}`;
  return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}
