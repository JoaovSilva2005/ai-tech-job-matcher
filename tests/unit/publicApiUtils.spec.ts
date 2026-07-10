import { expect, test } from '@playwright/test';
import { SourceUnavailableError } from '../../src/scraper/sourceErrors';
import { fetchPublicJson, fetchPublicText } from '../../src/scraper/sources/publicApiUtils';

test.describe('public source HTTP client', () => {
  test('returns JSON and text payloads from successful responses', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) =>
      String(url).endsWith('/json')
        ? new Response(JSON.stringify({ jobs: [1] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response('<html>jobs</html>', { status: 200 });

    try {
      await expect(fetchPublicJson('https://example.com/json', 'Example')).resolves.toEqual({
        jobs: [1],
      });
      await expect(fetchPublicText('https://example.com/jobs', 'Example')).resolves.toBe(
        '<html>jobs</html>'
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('reports an unavailable source instead of treating HTTP errors as no jobs', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('maintenance', { status: 503 });

    try {
      const error = await fetchPublicJson('https://example.com/jobs', 'Example').catch(
        (reason: unknown) => reason
      );
      expect(error).toBeInstanceOf(SourceUnavailableError);
      expect(error).toMatchObject({ sourceName: 'Example', status: 503 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('aborts slow public requests at the configured timeout', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });

    try {
      const error = await fetchPublicText('https://example.com/jobs', 'Slow Source', 5).catch(
        (reason: unknown) => reason
      );
      expect(error).toBeInstanceOf(SourceUnavailableError);
      expect((error as Error).message).toContain('timed out after 5ms');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
