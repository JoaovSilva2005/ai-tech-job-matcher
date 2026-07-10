import type { ScrapedJob } from '../scraper/types';

export interface LocationPreference {
  score: number;
  label: string;
  distanceKm?: number;
}

export interface ParsedLocation {
  normalized: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

interface CityCoordinates {
  state: string;
  latitude: number;
  longitude: number;
}

const CITIES: Record<string, CityCoordinates> = {
  'sao paulo': { state: 'sp', latitude: -23.5505, longitude: -46.6333 },
  campinas: { state: 'sp', latitude: -22.9056, longitude: -47.0608 },
  santos: { state: 'sp', latitude: -23.9608, longitude: -46.3336 },
  guarulhos: { state: 'sp', latitude: -23.4543, longitude: -46.5337 },
  sorocaba: { state: 'sp', latitude: -23.5015, longitude: -47.4526 },
  jundiai: { state: 'sp', latitude: -23.1857, longitude: -46.8978 },
  'sao jose dos campos': { state: 'sp', latitude: -23.2237, longitude: -45.9009 },
  'ribeirao preto': { state: 'sp', latitude: -21.1699, longitude: -47.8099 },
  'rio de janeiro': { state: 'rj', latitude: -22.9068, longitude: -43.1729 },
  niteroi: { state: 'rj', latitude: -22.8832, longitude: -43.1034 },
  curitiba: { state: 'pr', latitude: -25.4284, longitude: -49.2733 },
  londrina: { state: 'pr', latitude: -23.3045, longitude: -51.1696 },
  maringa: { state: 'pr', latitude: -23.4205, longitude: -51.9333 },
  'belo horizonte': { state: 'mg', latitude: -19.9167, longitude: -43.9345 },
  uberlandia: { state: 'mg', latitude: -18.9146, longitude: -48.2754 },
  florianopolis: { state: 'sc', latitude: -27.5949, longitude: -48.5482 },
  joinville: { state: 'sc', latitude: -26.3044, longitude: -48.8487 },
  blumenau: { state: 'sc', latitude: -26.9194, longitude: -49.0661 },
  'porto alegre': { state: 'rs', latitude: -30.0346, longitude: -51.2177 },
  'caxias do sul': { state: 'rs', latitude: -29.1634, longitude: -51.1797 },
  recife: { state: 'pe', latitude: -8.0476, longitude: -34.877 },
  'joao pessoa': { state: 'pb', latitude: -7.1195, longitude: -34.845 },
  'campina grande': { state: 'pb', latitude: -7.2307, longitude: -35.8817 },
  salvador: { state: 'ba', latitude: -12.9777, longitude: -38.5016 },
  brasilia: { state: 'df', latitude: -15.7939, longitude: -47.8828 },
  goiania: { state: 'go', latitude: -16.6869, longitude: -49.2648 },
  fortaleza: { state: 'ce', latitude: -3.7319, longitude: -38.5267 },
  manaus: { state: 'am', latitude: -3.119, longitude: -60.0217 },
  belem: { state: 'pa', latitude: -1.4558, longitude: -48.4902 },
  vitoria: { state: 'es', latitude: -20.3155, longitude: -40.3128 },
  natal: { state: 'rn', latitude: -5.7945, longitude: -35.211 },
  maceio: { state: 'al', latitude: -9.6498, longitude: -35.7089 },
  aracaju: { state: 'se', latitude: -10.9472, longitude: -37.0731 },
  'sao luis': { state: 'ma', latitude: -2.5307, longitude: -44.3068 },
  teresina: { state: 'pi', latitude: -5.0892, longitude: -42.8019 },
  cuiaba: { state: 'mt', latitude: -15.6014, longitude: -56.0979 },
  'campo grande': { state: 'ms', latitude: -20.4697, longitude: -54.6201 },
  'porto velho': { state: 'ro', latitude: -8.7608, longitude: -63.8999 },
  'boa vista': { state: 'rr', latitude: 2.8235, longitude: -60.6758 },
  'rio branco': { state: 'ac', latitude: -9.9754, longitude: -67.8249 },
  macapa: { state: 'ap', latitude: 0.0349, longitude: -51.0694 },
  palmas: { state: 'to', latitude: -10.2491, longitude: -48.3243 },
};

const STATE_ALIASES: Record<string, string[]> = {
  ac: ['ac', 'acre'],
  al: ['al', 'alagoas'],
  ap: ['ap', 'amapa'],
  am: ['am', 'amazonas'],
  ba: ['ba', 'bahia'],
  ce: ['ce', 'ceara'],
  df: ['df', 'brasilia', 'distrito federal'],
  es: ['es', 'espirito santo'],
  go: ['go', 'goias'],
  ma: ['ma', 'maranhao'],
  mt: ['mt', 'mato grosso'],
  ms: ['ms', 'mato grosso do sul'],
  mg: ['mg', 'minas gerais'],
  pa: ['pa', 'para'],
  pb: ['pb', 'paraiba'],
  pr: ['pr', 'parana'],
  pe: ['pe', 'pernambuco'],
  pi: ['pi', 'piaui'],
  rj: ['rj', 'rio de janeiro'],
  rn: ['rn', 'rio grande do norte'],
  rs: ['rs', 'rio grande do sul'],
  ro: ['ro', 'rondonia'],
  rr: ['rr', 'roraima'],
  sc: ['sc', 'santa catarina'],
  sp: ['sp', 'sao paulo'],
  se: ['se', 'sergipe'],
  to: ['to', 'tocantins'],
};

export function scoreLocationPreference(job: ScrapedJob, userLocation: string): LocationPreference {
  const preferred = parseLocation(userLocation);
  if (!preferred.normalized) return { score: 0, label: 'not provided' };

  let jobLocation = parseLocation(job.location ?? '');
  if (!jobLocation.city && !jobLocation.state) {
    jobLocation = parseLocation(`${job.location ?? ''} ${job.description}`);
  }

  if (preferred.city && preferred.city === jobLocation.city) {
    return { score: 12, label: `same city (${displayCity(preferred.city)})`, distanceKm: 0 };
  }

  if (hasCoordinates(preferred) && hasCoordinates(jobLocation)) {
    const distanceKm = Math.round(
      haversineKm(
        preferred.latitude,
        preferred.longitude,
        jobLocation.latitude,
        jobLocation.longitude
      )
    );
    if (distanceKm <= 75) {
      return { score: 10, label: `nearby (${distanceKm} km)`, distanceKm };
    }
    if (distanceKm <= 200) {
      return { score: 7, label: `regional match (${distanceKm} km)`, distanceKm };
    }
  }

  if (preferred.state && preferred.state === jobLocation.state) {
    return { score: 6, label: `same state (${preferred.state.toUpperCase()})` };
  }

  if (job.workMode === 'remote') return { score: 4, label: 'remote-friendly' };
  if (job.workMode === 'hybrid') return { score: 1, label: 'hybrid, location not confirmed' };
  return { score: 0, label: 'no location match' };
}

export function parseLocation(value: string): ParsedLocation {
  const normalized = normalize(value);
  if (!normalized) return { normalized: '' };

  const city = Object.keys(CITIES)
    .sort((a, b) => b.length - a.length)
    .find((knownCity) => containsTokenOrPhrase(normalized, knownCity));
  const coordinates = city ? CITIES[city] : undefined;
  const state =
    coordinates?.state ??
    Object.entries(STATE_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => containsTokenOrPhrase(normalized, alias))
    )?.[0];

  return {
    normalized,
    city,
    state,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
  };
}

function hasCoordinates(
  location: ParsedLocation
): location is ParsedLocation & { latitude: number; longitude: number } {
  return location.latitude !== undefined && location.longitude !== undefined;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function displayCity(city: string): string {
  return city.replace(/\b\w/g, (letter) => letter.toUpperCase());
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
