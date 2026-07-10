import { SourceUnavailableError } from '../sourceErrors';

const PUBLIC_SOURCE_USER_AGENT =
  'ai-tech-job-matcher (portfolio project; single low-volume request; contact via GitHub)';

const PUBLIC_API_TIMEOUT_MS = 15_000;

export async function fetchPublicJson<T>(
  url: string,
  sourceName: string,
  timeoutMs = PUBLIC_API_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': PUBLIC_SOURCE_USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new SourceUnavailableError(
        sourceName,
        `${sourceName} API returned status ${response.status}`,
        response.status
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    const reason = controller.signal.aborted
      ? `timed out after ${timeoutMs}ms`
      : (error as Error).message;
    throw new SourceUnavailableError(sourceName, `${sourceName} source unavailable (${reason})`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPublicText(
  url: string,
  sourceName: string,
  timeoutMs = PUBLIC_API_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': PUBLIC_SOURCE_USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new SourceUnavailableError(
        sourceName,
        `${sourceName} public page returned status ${response.status}`,
        response.status
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof SourceUnavailableError) throw error;
    const reason = controller.signal.aborted
      ? `timed out after ${timeoutMs}ms`
      : (error as Error).message;
    throw new SourceUnavailableError(
      sourceName,
      `${sourceName} public page unavailable (${reason})`
    );
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
