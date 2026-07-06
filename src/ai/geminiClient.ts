import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { AiRequestError } from './openAiClient';

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * Minimal Gemini generateContent client using global fetch (Node 18+).
 * JSON mode keeps the response easier to validate with the existing Zod schemas.
 */
export async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const env = getEnv();
  if (!env.GEMINI_API_KEY) {
    throw new AiRequestError('GEMINI_API_KEY is not configured');
  }

  const model = encodeURIComponent(env.GEMINI_MODEL);
  const apiKey = encodeURIComponent(env.GEMINI_API_KEY);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new AiRequestError(`Gemini API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const content = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!content) {
    throw new AiRequestError('Gemini API returned an empty response');
  }
  logger.debug(`Gemini response received (${content.length} chars)`);
  return content;
}
