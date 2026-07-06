import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

export class AiRequestError extends Error {}

/**
 * Minimal OpenAI Chat Completions client using global fetch (Node 18+).
 * No SDK dependency keeps the project light; errors bubble up so the
 * adapter layer can fall back to the local analyzer.
 */
export async function callOpenAi(systemPrompt: string, userPrompt: string): Promise<string> {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new AiRequestError('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AiRequestError(`OpenAI API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new AiRequestError('OpenAI API returned an empty response');
  }
  logger.debug(`OpenAI response received (${content.length} chars)`);
  return content;
}
