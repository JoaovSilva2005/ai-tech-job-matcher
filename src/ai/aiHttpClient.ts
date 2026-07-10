import { getEnv } from '../config/env';

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class AiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}

export async function fetchAiResponse(
  provider: string,
  url: string,
  init: RequestInit
): Promise<Response> {
  const env = getEnv();
  let lastError: AiRequestError | undefined;

  for (let attempt = 0; attempt <= env.AI_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok) return response;

      const body = await response.text();
      lastError = new AiRequestError(
        `${provider} API error ${response.status}: ${body.slice(0, 200)}`,
        response.status
      );
      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt >= env.AI_MAX_RETRIES) {
        throw lastError;
      }

      await delay(retryDelayMs(response, env.AI_RETRY_DELAY_MS, attempt));
    } catch (error) {
      if (controller.signal.aborted) {
        throw new AiRequestError(
          `${provider} request timed out after ${env.AI_REQUEST_TIMEOUT_MS}ms`
        );
      }
      if (error instanceof AiRequestError) {
        if (!RETRYABLE_STATUS_CODES.has(error.status ?? 0) || attempt >= env.AI_MAX_RETRIES) {
          throw error;
        }
        lastError = error;
      } else {
        lastError = new AiRequestError(
          `${provider} network request failed: ${(error as Error).message}`
        );
        if (attempt >= env.AI_MAX_RETRIES) throw lastError;
        await delay(env.AI_RETRY_DELAY_MS * (attempt + 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new AiRequestError(`${provider} request failed`);
}

function retryDelayMs(response: Response, baseDelayMs: number, attempt: number): number {
  const retryAfter = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : Number.NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(5_000, retryAfterSeconds * 1_000);
  }
  return baseDelayMs * (attempt + 1);
}

function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
