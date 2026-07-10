import { expect, test } from '@playwright/test';
import { resetEnvCache } from '../../src/config/env';
import { getAiClient } from '../../src/ai/aiClient';
import { callGemini } from '../../src/ai/geminiClient';

const originalFetch = globalThis.fetch;
const originalEnv = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  AI_MAX_RETRIES: process.env.AI_MAX_RETRIES,
};

test.afterEach(() => {
  process.env.AI_PROVIDER = originalEnv.AI_PROVIDER;
  process.env.GEMINI_API_KEY = originalEnv.GEMINI_API_KEY;
  process.env.GEMINI_MODEL = originalEnv.GEMINI_MODEL;
  if (originalEnv.AI_MAX_RETRIES === undefined) delete process.env.AI_MAX_RETRIES;
  else process.env.AI_MAX_RETRIES = originalEnv.AI_MAX_RETRIES;
  globalThis.fetch = originalFetch;
  resetEnvCache();
});

test.describe('Gemini AI provider', () => {
  test('getAiClient selects Gemini when provider and key are configured', () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    resetEnvCache();

    const { client, reason } = getAiClient();

    expect(client.providerName).toBe('gemini');
    expect(client.isFallback).toBe(false);
    expect(reason).toBe('AI_PROVIDER=gemini');
  });

  test('getAiClient falls back when Gemini is selected without a key', () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = '';
    resetEnvCache();

    const { client, reason } = getAiClient();

    expect(client.providerName).toBe('local-fallback');
    expect(client.isFallback).toBe(true);
    expect(reason).toBe('gemini selected but no API key');
  });

  test('callGemini uses generateContent JSON mode and returns text content', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash-lite';
    resetEnvCache();

    let requestedUrl = '';
    let requestedBody: unknown;
    globalThis.fetch = async (url, init) => {
      requestedUrl = String(url);
      requestedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"detectedSeniority":"junior"}' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await callGemini('system prompt', 'user prompt');

    expect(requestedUrl).toContain('/v1beta/models/gemini-2.5-flash-lite:generateContent');
    expect(requestedUrl).toContain('key=test-key');
    expect(requestedBody).toMatchObject({
      systemInstruction: { parts: [{ text: 'system prompt' }] },
      contents: [{ role: 'user', parts: [{ text: 'user prompt' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    expect(result).toBe('{"detectedSeniority":"junior"}');
  });

  test('falls back when Gemini returns valid JSON with no usable analysis', async () => {
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.AI_MAX_RETRIES = '0';
    resetEnvCache();

    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const { client } = getAiClient();
    const analysis = await client.analyzeResume(
      'Junior QA Analyst with Playwright, TypeScript, Git and API Testing experience.'
    );

    expect(calls).toBe(2);
    expect(analysis.fallbackMode).toBe(true);
    expect(analysis.qaSkills).toContain('Playwright');
  });
});
