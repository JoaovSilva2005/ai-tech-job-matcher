import type { ScrapedJob } from '../scraper/types';

export interface LocationPreference {
  score: number;
  label: string;
}

const CITY_STATE: Record<string, string> = {
  'sao paulo': 'sp',
  campinas: 'sp',
  santos: 'sp',
  guarulhos: 'sp',
  sorocaba: 'sp',
  'rio de janeiro': 'rj',
  niteroi: 'rj',
  curitiba: 'pr',
  londrina: 'pr',
  'belo horizonte': 'mg',
  uberlandia: 'mg',
  florianopolis: 'sc',
  joinville: 'sc',
  blumenau: 'sc',
  'porto alegre': 'rs',
  recife: 'pe',
  campina: 'pb',
  salvador: 'ba',
  brasilia: 'df',
  goiania: 'go',
  fortaleza: 'ce',
  manaus: 'am',
  belem: 'pa',
};

const STATE_ALIASES: Record<string, string[]> = {
  sp: ['sp', 'sao paulo'],
  rj: ['rj', 'rio de janeiro'],
  pr: ['pr', 'parana'],
  mg: ['mg', 'minas gerais'],
  sc: ['sc', 'santa catarina'],
  rs: ['rs', 'rio grande do sul'],
  pe: ['pe', 'pernambuco'],
  pb: ['pb', 'paraiba'],
  ba: ['ba', 'bahia'],
  df: ['df', 'brasilia', 'distrito federal'],
  go: ['go', 'goias'],
  ce: ['ce', 'ceara'],
  am: ['am', 'amazonas'],
  pa: ['pa', 'para'],
};

export function scoreLocationPreference(job: ScrapedJob, userLocation: string): LocationPreference {
  const preferred = parseLocation(userLocation);
  if (!preferred.normalized) return { score: 0, label: 'not provided' };

  const jobLocation = parseLocation(job.location ?? '');
  const jobText = normalize(`${job.location ?? ''} ${job.description}`);

  if (preferred.city && jobText.includes(preferred.city)) {
    return { score: 12, label: `same city (${preferred.city})` };
  }

  if (preferred.state && locationHasState(jobLocation.normalized, preferred.state)) {
    return { score: 7, label: `same state (${preferred.state.toUpperCase()})` };
  }

  if (job.workMode === 'remote') {
    return { score: 4, label: 'remote-friendly' };
  }

  if (job.workMode === 'hybrid') {
    return { score: 1, label: 'hybrid, location not confirmed' };
  }

  return { score: 0, label: 'no location match' };
}

export function parseLocation(value: string): { normalized: string; city?: string; state?: string } {
  const normalized = normalize(value);
  if (!normalized) return { normalized: '' };

  const city = Object.keys(CITY_STATE)
    .sort((a, b) => b.length - a.length)
    .find((knownCity) => normalized.includes(knownCity));

  const state =
    (city ? CITY_STATE[city] : undefined) ??
    Object.entries(STATE_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => containsTokenOrPhrase(normalized, alias))
    )?.[0];

  return { normalized, city, state };
}

function locationHasState(normalizedLocation: string, state: string): boolean {
  return (STATE_ALIASES[state] ?? [state]).some((alias) =>
    containsTokenOrPhrase(normalizedLocation, alias)
  );
}

function containsTokenOrPhrase(value: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(value);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
