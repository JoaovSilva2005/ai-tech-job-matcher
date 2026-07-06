import { getEnv } from '../../config/env';
import { classifyRole } from '../../matcher/classifyRole';
import { nowIso } from '../../utils/date';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import type { ScrapedJob, ScrapeOptions, WorkMode } from '../types';
import { logger } from '../../utils/logger';
import { normalizeWorkMode } from './sampleHtmlScraper';
import { fetchPublicText, parseCommaList } from './publicApiUtils';

const DEFAULT_GUPY_CAREER_URLS = [
  'https://topazbrasil.gupy.io/',
  'https://qualitydigital.gupy.io/',
  'https://sidi.gupy.io/',
];
const MAX_GUPY_JOBS = 12;
const MAX_GUPY_CAREER_PAGES = 3;

interface GupyNextData {
  props?: {
    pageProps?: {
      careerPage?: GupyCareerPage;
      jobs?: GupyCareerJob[];
      job?: GupyJobDetail;
    };
  };
}

interface GupyCareerPage {
  publicationName?: string;
  name?: string;
  subdomain?: string;
}

interface GupyCareerJob {
  id?: number;
  title?: string;
  department?: string;
  workplace?: {
    workplaceType?: string;
    address?: {
      city?: string;
      state?: string;
      stateShortName?: string;
      country?: string;
    };
  };
}

interface GupyJobDetail {
  id?: number;
  name?: string;
  description?: string;
  responsibilities?: string;
  prerequisites?: string;
  additionalInformation?: string;
  careerPageName?: string;
  companyName?: string;
  departmentName?: string;
  addressCity?: string;
  addressState?: string;
  addressStateShortName?: string;
  addressCountry?: string;
  workplaceType?: string;
  remoteWorking?: boolean;
  status?: string;
}

interface GupyCandidate {
  id: number;
  title: string;
  company: string;
  department: string;
  url: string;
  location: string;
  workMode: WorkMode;
}

export async function scrapeGupyJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const limit = Math.min(options.limit, MAX_GUPY_JOBS);
  const careerUrls = getGupyCareerUrls();
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];

  for (const careerUrl of careerUrls.slice(0, MAX_GUPY_CAREER_PAGES)) {
    if (jobs.length >= limit) break;

    const html = await fetchPublicText(careerUrl, 'Gupy');
    if (!html) continue;

    const data = parseGupyNextData(html);
    const pageProps = data?.props?.pageProps;
    const candidates = extractCareerCandidates(careerUrl, pageProps?.careerPage, pageProps?.jobs);

    for (const candidate of candidates) {
      if (jobs.length >= limit) break;
      if (!jobMatchesRequestedRole(options.role, candidate.title, candidate.department)) continue;

      const detailHtml = await fetchPublicText(candidate.url, 'Gupy');
      const detail = detailHtml ? parseGupyNextData(detailHtml)?.props?.pageProps?.job : null;
      const mapped = detail
        ? mapGupyJobDetail(detail, candidate.url, scrapedAt, candidate)
        : mapGupyCandidate(candidate, scrapedAt);

      if (mapped && jobMatchesRequestedRole(options.role, mapped.title, mapped.description)) {
        jobs.push(mapped);
      }
    }
  }

  if (jobs.length === 0) {
    logger.warn('Gupy: no matching public jobs found in the configured career pages.');
  } else {
    logger.info(`Gupy: collected ${jobs.length} public Brazilian job(s).`);
  }

  return jobs;
}

export function parseGupyNextData(html: string): GupyNextData | null {
  const markerIndex = html.indexOf('__NEXT_DATA__');
  if (markerIndex < 0) return null;

  const scriptStart = html.lastIndexOf('<script', markerIndex);
  const jsonStart = html.indexOf('>', scriptStart) + 1;
  const jsonEnd = html.indexOf('</script>', jsonStart);
  if (scriptStart < 0 || jsonStart <= 0 || jsonEnd < 0) return null;

  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd)) as GupyNextData;
  } catch {
    return null;
  }
}

export function mapGupyJobDetail(
  detail: GupyJobDetail,
  url: string,
  scrapedAt: string,
  fallback?: GupyCandidate
): ScrapedJob | null {
  const title = normalizeWhitespace(detail.name ?? fallback?.title ?? '');
  const company = normalizeWhitespace(
    detail.careerPageName ?? detail.companyName ?? fallback?.company ?? companyFromGupyUrl(url)
  );
  const description = normalizeWhitespace(
    stripHtml(
      [
        detail.description,
        detail.responsibilities,
        detail.prerequisites,
        detail.additionalInformation,
      ]
        .filter(Boolean)
        .join(' ')
    )
  ).slice(0, 4000);

  if (!title || !company || !url || description.length < 60) return null;

  const location = buildDetailLocation(detail) || fallback?.location || 'Brasil';
  const workplace = normalizeWhitespace(`${detail.workplaceType ?? ''} ${detail.remoteWorking ? 'remote' : ''}`);

  return {
    id: `gupy-${detail.id ?? fallback?.id ?? slugForId(title, company)}`,
    title,
    company,
    location,
    workMode: normalizeWorkMode(workplace || fallback?.workMode || location),
    url,
    description: normalizeWhitespace(
      `Source: Gupy public career page. Department: ${
        detail.departmentName ?? fallback?.department ?? 'not specified'
      }. ${description}`
    ),
    source: 'gupy',
    scrapedAt,
  };
}

function mapGupyCandidate(candidate: GupyCandidate, scrapedAt: string): ScrapedJob | null {
  const description = normalizeWhitespace(
    `Source: Gupy public career page. Department: ${candidate.department}. Location: ${candidate.location}.`
  );
  if (description.length < 60) return null;

  return {
    id: `gupy-${candidate.id}`,
    title: candidate.title,
    company: candidate.company,
    location: candidate.location,
    workMode: candidate.workMode,
    url: candidate.url,
    description,
    source: 'gupy',
    scrapedAt,
  };
}

function extractCareerCandidates(
  careerUrl: string,
  careerPage?: GupyCareerPage,
  entries: GupyCareerJob[] = []
): GupyCandidate[] {
  const company = normalizeWhitespace(
    careerPage?.publicationName ?? careerPage?.name ?? companyFromGupyUrl(careerUrl)
  );

  return entries.flatMap((entry) => {
    if (!entry.id || !entry.title) return [];

    const location = buildCareerLocation(entry);
    return [
      {
        id: entry.id,
        title: normalizeWhitespace(entry.title),
        company,
        department: normalizeWhitespace(entry.department ?? 'not specified'),
        url: new URL(`/jobs/${entry.id}?jobBoardSource=gupy_public_page`, careerUrl).toString(),
        location: location || 'Brasil',
        workMode: normalizeWorkMode(`${entry.workplace?.workplaceType ?? ''} ${location}`),
      },
    ];
  });
}

function getGupyCareerUrls(): string[] {
  const configured = parseCommaList(getEnv().GUPY_CAREER_URLS);
  return configured.length > 0 ? configured : DEFAULT_GUPY_CAREER_URLS;
}

function buildCareerLocation(entry: GupyCareerJob): string {
  const address = entry.workplace?.address;
  return [address?.city, address?.stateShortName ?? address?.state, address?.country]
    .map((part) => normalizeWhitespace(part ?? ''))
    .filter(Boolean)
    .join(', ');
}

function buildDetailLocation(detail: GupyJobDetail): string {
  return [detail.addressCity, detail.addressStateShortName ?? detail.addressState, detail.addressCountry]
    .map((part) => normalizeWhitespace(part ?? ''))
    .filter(Boolean)
    .join(', ');
}

function jobMatchesRequestedRole(
  role: ScrapeOptions['role'],
  title: string,
  description: string
): boolean {
  if (!role || role === 'all' || role === 'unknown') return true;
  return classifyRole(title, description) === role;
}

function companyFromGupyUrl(url: string): string {
  const host = new URL(url).hostname;
  const subdomain = host.split('.')[0] ?? 'Gupy';
  return subdomain
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugForId(title: string, company: string): string {
  return `${company}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
