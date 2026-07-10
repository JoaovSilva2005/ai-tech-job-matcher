import { expect, test } from '@playwright/test';
import { fetchAiResponse } from '../../src/ai/aiHttpClient';
import { resetEnvCache } from '../../src/config/env';

const originalFetch = globalThis.fetch;
const ENV_KEYS = ['AI_REQUEST_TIMEOUT_MS', 'AI_MAX_RETRIES', 'AI_RETRY_DELAY_MS'] as const;
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetEnvCache();
});

test.describe('AI HTTP client', () => {
  test('retries a transient server response and then succeeds', async () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '1000';
    process.env.AI_MAX_RETRIES = '1';
    process.env.AI_RETRY_DELAY_MS = '0';
    resetEnvCache();

    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      return attempts === 1
        ? new Response('temporary outage', { status: 503 })
        : new Response('{"ok":true}', { status: 200 });
    };

    const response = await fetchAiResponse('Test AI', 'https://ai.test/analyze', {
      method: 'POST',
    });

    expect(attempts).toBe(2);
    expect(await response.json()).toEqual({ ok: true });
  });

  test('aborts a timed-out request without retrying it', async () => {
    process.env.AI_REQUEST_TIMEOUT_MS = '50';
    process.env.AI_MAX_RETRIES = '3';
    process.env.AI_RETRY_DELAY_MS = '0';
    resetEnvCache();

    let attempts = 0;
    globalThis.fetch = async (_url, init) => {
      attempts += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    };

    await expect(
      fetchAiResponse('Test AI', 'https://ai.test/analyze', { method: 'POST' })
    ).rejects.toThrow('timed out after 50ms');
    expect(attempts).toBe(1);
  });
});
