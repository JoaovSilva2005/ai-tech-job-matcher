import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { AiRequestError } from './openAiClient';

/**
 * Minimal Anthropic Messages API client using global fetch (Node 18+).
 */
export async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  const env = getEnv();
  if (!env.ANTHROPIC_API_KEY) {
    throw new AiRequestError('ANTHROPIC_API_KEY is not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 2048,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AiRequestError(`Anthropic API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const content = data.content?.find((block) => block.type === 'text')?.text;
  if (!content) {
    throw new AiRequestError('Anthropic API returned an empty response');
  }
  logger.debug(`Anthropic response received (${content.length} chars)`);
  return content;
}
