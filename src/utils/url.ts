export function isValidUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    // strip common tracking params
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach((p) =>
      url.searchParams.delete(p)
    );
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim();
  }
}
