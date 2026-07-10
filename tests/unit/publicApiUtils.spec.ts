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

  test('supports authenticated JSON POST requests without dropping the user agent', async () => {
    const originalFetch = globalThis.fetch;
    let captured: RequestInit | undefined;
    globalThis.fetch = async (_url, init) => {
      captured = init;
      return Response.json({ jobs: [] });
    };

    try {
      await fetchPublicJson('https://example.com/search', 'Example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': 'test-key' },
        body: JSON.stringify({ role: 'qa' }),
      });
      expect(captured?.method).toBe('POST');
      expect(captured?.headers).toMatchObject({
        'Content-Type': 'application/json',
        'X-Api-Key': 'test-key',
        'User-Agent': expect.stringContaining('ai-tech-job-matcher'),
      });
      expect(captured?.body).toBe('{"role":"qa"}');
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
