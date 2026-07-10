import type { WorkMode } from './types';

export function normalizeWorkMode(raw: string): WorkMode {
  const value = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (/\bhybrid\b|\bhibrid[oa]\b/.test(value)) return 'hybrid';
  if (
    /\bnot remote\b|\bno remote\b|\bwithout remote\b|\bsem remoto\b|\b100% (?:office|onsite|presencial)\b/.test(
      value
    )
  ) {
    return 'onsite';
  }
  if (/\bremote\b|\bremot[oa]\b|\bhome office\b|\bwork from home\b/.test(value)) return 'remote';
  if (/\bonsite\b|\bon-site\b|\bpresencial\b|\bin-office\b|\bno escritorio\b/.test(value)) {
    return 'onsite';
  }
  return 'unknown';
}
