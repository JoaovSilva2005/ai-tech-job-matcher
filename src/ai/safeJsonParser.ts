/**
 * AI models sometimes wrap JSON in markdown fences or add commentary.
 * This parser extracts and repairs the JSON payload defensively before
 * the response is validated with Zod.
 */

export function safeJsonParse(raw: string): unknown | null {
  if (!raw) return null;

  const candidates = [raw.trim(), stripMarkdownFences(raw), extractJsonObject(raw)];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = tryParse(candidate) ?? tryParse(repairCommonIssues(candidate));
    if (parsed !== null && typeof parsed === 'object') {
      return parsed;
    }
  }
  return null;
}

function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function repairCommonIssues(text: string): string {
  return text
    // remove trailing commas before } or ]
    .replace(/,\s*([}\]])/g, '$1')
    // normalize smart quotes
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}
