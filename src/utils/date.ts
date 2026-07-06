export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDateHuman(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
