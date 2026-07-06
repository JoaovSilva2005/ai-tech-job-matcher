import { logger } from '../../utils/logger';

export const PUBLIC_SOURCE_USER_AGENT =
  'ai-tech-job-matcher (portfolio project; single low-volume request; contact via GitHub)';

export const PUBLIC_API_TIMEOUT_MS = 15_000;

export async function fetchPublicJson<T>(
  url: string,
  sourceName: string,
  timeoutMs = PUBLIC_API_TIMEOUT_MS
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': PUBLIC_SOURCE_USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn(`${sourceName} API returned status ${response.status}; skipping this source.`);
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.warn(
      `${sourceName} source unavailable (${(error as Error).message}); returning no jobs. ` +
        'Try another real source such as --source themuse or --source greenhouse.'
    );
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
