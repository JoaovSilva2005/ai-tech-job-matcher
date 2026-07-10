/**
 * Repairs "mojibake" — text whose UTF-8 bytes were mistakenly decoded as
 * Latin-1 by an upstream source, producing garbled sequences instead of the
 * original characters. Some public job APIs (e.g. RemoteOK) return
 * double-encoded location strings.
 *
 * Detection is conservative: it only re-decodes when a classic mojibake lead
 * byte (U+00C2..U+00DB, e.g. "A-tilde"/"O-slash") is immediately followed by a
 * UTF-8 continuation byte (U+0080..U+00BF). Correctly-encoded accented text
 * such as "Sao Paulo" (with a single accented char) never matches that
 * pattern, so it is left untouched. If re-decoding produces the Unicode
 * replacement character (U+FFFD) the original string is kept.
 */
const MOJIBAKE_PATTERN = /[ÂÃÐÑØÙÚÛ][-¿]/;

export function repairMojibake(text: string): string {
  if (!MOJIBAKE_PATTERN.test(text)) {
    return text;
  }
  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8');
    return repaired.includes('�') ? text : repaired;
  } catch {
    return text;
  }
}

export function normalizeWhitespace(text: string): string {
  return repairMojibake(text).replace(/\s+/g, ' ').trim();
}

/** Removes HTML tags and decodes the most common entities from API job descriptions. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ');
}

/**
 * Case-insensitive whole-word(ish) search used by the fallback analyzer.
 * Handles terms with special characters like "node.js" and "c#".
 */
export function containsKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b does not work next to symbols like "#" or ".", so we use lookarounds
  const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
  return pattern.test(text);
}
