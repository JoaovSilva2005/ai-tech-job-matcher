import { getEnv } from '../../config/env';
import { classifyRole, isLikelyTechJobTitle } from '../../matcher/classifyRole';
import { mapWithConcurrency } from '../../utils/async';
import { nowIso } from '../../utils/date';
import { logger } from '../../utils/logger';
import { normalizeWhitespace, stripHtml } from '../../utils/text';
import { normalizeWorkMode } from '../normalizeWorkMode';
import { matchesRequestedRole } from '../sourceFilters';
import type { ScrapedJob, ScrapeOptions, WorkMode } from '../types';
import { fetchPublicJson, parseCommaList } from './publicApiUtils';

const SMARTRECRUITERS_API = 'https://api.smartrecruiters.com/v1/companies';
const MAX_SMARTRECRUITERS_COMPANIES = 3;
const MAX_SMARTRECRUITERS_JOBS = 10;

interface SmartRecruitersListResponse {
  content?: SmartRecruitersPosting[];
}

interface SmartRecruitersPosting {
  id?: string;
  uuid?: string;
  name?: string;
  releasedDate?: string;
  active?: boolean;
  applyUrl?: string;
  company?: { identifier?: string; name?: string };
  location?: { city?: string; region?: string; country?: string; remote?: boolean };
  department?: { label?: string; description?: string };
  function?: { label?: string };
  typeOfEmployment?: { label?: string };
  experienceLevel?: { label?: string };
  jobAd?: {
    sections?: Record<string, { title?: string; text?: string }>;
  };
}

export async function scrapeSmartRecruitersJobs(options: ScrapeOptions): Promise<ScrapedJob[]> {
  const env = getEnv();
  const configured = parseCommaList(env.SMARTRECRUITERS_COMPANY_IDS);
  const companies = configured.slice(0, MAX_SMARTRECRUITERS_COMPANIES);
  const limit = Math.min(options.limit, MAX_SMARTRECRUITERS_JOBS);
  const headers = env.SMARTRECRUITERS_API_KEY
    ? { 'X-SmartToken': env.SMARTRECRUITERS_API_KEY }
    : undefined;
  const scrapedAt = nowIso();
  const jobs: ScrapedJob[] = [];
  let successfulLists = 0;
  let lastError: Error | undefined;

  if (configured.length > MAX_SMARTRECRUITERS_COMPANIES) {
    logger.warn(
      `SmartRecruiters: using only the first ${MAX_SMARTRECRUITERS_COMPANIES} configured companies.`
    );
  }

  for (const companyId of companies) {
    try {
      const list = await fetchPublicJson<SmartRecruitersListResponse>(
        `${SMARTRECRUITERS_API}/${encodeURIComponent(companyId)}/postings?limit=100&offset=0`,
        `SmartRecruiters (${companyId})`,
        { headers }
      );
      successfulLists += 1;
      const candidates = (list.content ?? [])
        .filter((entry) => candidateMayMatch(options, entry))
        .slice(0, limit - jobs.length);

      const details = await mapWithConcurrency(candidates, 2, async (entry) => {
        if (!entry.id) return null;
        try {
          return await fetchPublicJson<SmartRecruitersPosting>(
            `${SMARTRECRUITERS_API}/${encodeURIComponent(companyId)}/postings/${encodeURIComponent(entry.id)}`,
            `SmartRecruiters (${companyId}/${entry.id})`,
            { headers }
          );
        } catch (error) {
          lastError = error as Error;
          logger.warn(lastError.message);
          return null;
        }
      });

      for (const detail of details) {
        const job = detail ? mapSmartRecruitersPosting(detail, companyId, scrapedAt) : null;
        if (!job || !matchesRequestedRole(options.role, job.title, job.description)) continue;
        jobs.push(job);
        if (jobs.length >= limit) break;
      }
    } catch (error) {
      lastError = error as Error;
      logger.warn(lastError.message);
    }
    if (jobs.length >= limit) break;
  }

  if (successfulLists === 0 && lastError) throw lastError;
  if (jobs.length > 0) logger.info(`SmartRecruiters: collected ${jobs.length} public job(s).`);
  else logger.warn('SmartRecruiters: no matching public jobs found.');
  return jobs;
}

export function mapSmartRecruitersPosting(
  entry: SmartRecruitersPosting,
  companyId: string,
  scrapedAt: string
): ScrapedJob | null {
  if (entry.active === false) return null;

  const title = normalizeWhitespace(entry.name ?? '');
  const company = normalizeWhitespace(entry.company?.name ?? humanizeIdentifier(companyId));
  const url = normalizeWhitespace(entry.applyUrl ?? '');
  const sections = Object.values(entry.jobAd?.sections ?? {})
    .map((section) => `${section.title ?? ''} ${stripHtml(section.text ?? '')}`)
    .join(' ');
  const description = normalizeWhitespace(sections).slice(0, 4000);
  if (!title || !company || !url || description.length < 60) return null;

  const location = [entry.location?.city, entry.location?.region, entry.location?.country]
    .map((part) => normalizeWhitespace(part ?? ''))
    .filter(Boolean)
    .join(', ');
  const metadata = `Department: ${entry.department?.label || 'not specified'}. Function: ${entry.function?.label || 'not specified'}. Employment: ${entry.typeOfEmployment?.label || 'not specified'}. Level: ${entry.experienceLevel?.label || 'not specified'}.`;

  return {
    id: `smartrecruiters-${companyId}-${entry.id ?? entry.uuid ?? slugForId(title, company)}`,
    title,
    company,
    location: location || 'Not specified',
    workMode: smartRecruitersWorkMode(entry, description),
    url,
    description: normalizeWhitespace(
      `Source: SmartRecruiters public Posting API. ${metadata} ${description}`
    ),
    source: 'smartrecruiters',
    scrapedAt,
    publishedAt: normalizeDate(entry.releasedDate),
    availability: 'active',
  };
}

function candidateMayMatch(options: ScrapeOptions, entry: SmartRecruitersPosting): boolean {
  const title = entry.name ?? '';
  const metadata = `${entry.department?.label ?? ''} ${entry.function?.label ?? ''}`;
  if (!options.role || options.role === 'unknown' || options.role === 'internship') return true;
  if (options.role === 'all') return isLikelyTechJobTitle(title);
  const role = classifyRole(title, metadata);
  return role === 'unknown' || role === options.role;
}

function smartRecruitersWorkMode(entry: SmartRecruitersPosting, description: string): WorkMode {
  if (entry.location?.remote === true) return 'remote';
  const inferred = normalizeWorkMode(`${entry.name ?? ''} ${description}`);
  return inferred === 'unknown' ? 'onsite' : inferred;
}

function humanizeIdentifier(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function normalizeDate(value: string | undefined): string | undefined {
  if (!value || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

function slugForId(title: string, company: string): string {
  return `${company}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
