import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  AI_PROVIDER: z.enum(['fallback', 'openai', 'anthropic', 'gemini']).default('fallback'),
  OPENAI_API_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().optional().default('gpt-4o-mini'),
  ANTHROPIC_MODEL: z.string().optional().default('claude-sonnet-5'),
  GEMINI_MODEL: z.string().optional().default('gemini-2.5-flash-lite'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(50).max(120_000).default(20_000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  AI_RETRY_DELAY_MS: z.coerce.number().int().min(0).max(5_000).default(250),
  AI_JOB_CONCURRENCY: z.coerce.number().int().min(1).max(5).default(2),
  GREENHOUSE_BOARD_TOKENS: z.string().optional().default(''),
  GUPY_CAREER_URLS: z.string().optional().default(''),
  LEVER_COMPANY_SLUGS: z.string().optional().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

/** Test helper: clears the cached env so tests can override process.env. */
export function resetEnvCache(): void {
  cached = null;
}
