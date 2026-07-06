import { z } from 'zod';
import { getEnv } from '../config/env';
import type { ScrapedJob } from '../scraper/types';
import type { ResumeAnalysis } from '../resume/resumeSchema';
import { resumeAnalysisSchema } from '../resume/resumeSchema';
import type { JobAnalysis } from './schemas';
import { jobAnalysisSchema } from './schemas';
import {
  buildJobAnalysisPrompt,
  buildJsonFixPrompt,
  buildResumeAnalysisPrompt,
  JOB_ANALYSIS_SYSTEM_PROMPT,
  RESUME_ANALYSIS_SYSTEM_PROMPT,
} from './prompts';
import { safeJsonParse } from './safeJsonParser';
import { fallbackAnalyzeJob, fallbackAnalyzeResume } from './fallbackAnalyzer';
import { callOpenAi } from './openAiClient';
import { callAnthropic } from './anthropicClient';
import { callGemini } from './geminiClient';
import { logger } from '../utils/logger';

export interface AiClient {
  readonly providerName: string;
  readonly isFallback: boolean;
  analyzeResume(text: string): Promise<ResumeAnalysis>;
  analyzeJob(job: ScrapedJob): Promise<JobAnalysis>;
}

type LlmCall = (systemPrompt: string, userPrompt: string) => Promise<string>;

class FallbackAiClient implements AiClient {
  readonly providerName = 'local-fallback';
  readonly isFallback = true;

  async analyzeResume(text: string): Promise<ResumeAnalysis> {
    return fallbackAnalyzeResume(text);
  }

  async analyzeJob(job: ScrapedJob): Promise<JobAnalysis> {
    return fallbackAnalyzeJob(job);
  }
}

class RemoteAiClient implements AiClient {
  readonly isFallback = false;

  constructor(
    readonly providerName: string,
    private readonly call: LlmCall
  ) {}

  async analyzeResume(text: string): Promise<ResumeAnalysis> {
    try {
      const analysis = await this.requestJson(
        RESUME_ANALYSIS_SYSTEM_PROMPT,
        buildResumeAnalysisPrompt(text),
        resumeAnalysisSchema
      );
      return { ...analysis, fallbackMode: false };
    } catch (error) {
      logger.warn(
        `AI resume analysis failed (${(error as Error).message}); using local fallback.`
      );
      return fallbackAnalyzeResume(text);
    }
  }

  async analyzeJob(job: ScrapedJob): Promise<JobAnalysis> {
    try {
      const analysis = await this.requestJson(
        JOB_ANALYSIS_SYSTEM_PROMPT,
        buildJobAnalysisPrompt(job),
        jobAnalysisSchema
      );
      return { ...analysis, fallbackMode: false };
    } catch (error) {
      logger.warn(
        `AI job analysis failed for "${job.title}" (${(error as Error).message}); using local fallback.`
      );
      return fallbackAnalyzeJob(job);
    }
  }

  /**
   * Calls the LLM and validates the JSON response. If the model returns
   * invalid JSON, we ask it once to fix its own output; if it still fails,
   * the caller falls back to the local analyzer.
   */
  private async requestJson<S extends z.ZodTypeAny>(
    systemPrompt: string,
    userPrompt: string,
    schema: S
  ): Promise<z.output<S>> {
    const raw = await this.call(systemPrompt, userPrompt);
    const parsed = safeJsonParse(raw);
    if (parsed) {
      const validated = schema.safeParse(parsed);
      if (validated.success) return validated.data;
    }

    logger.warn(`${this.providerName} returned invalid JSON; requesting a one-time fix...`);
    const fixedRaw = await this.call(systemPrompt, buildJsonFixPrompt(raw));
    const fixedParsed = safeJsonParse(fixedRaw);
    if (fixedParsed) {
      const validated = schema.safeParse(fixedParsed);
      if (validated.success) return validated.data;
    }

    throw new Error('AI returned invalid JSON twice');
  }
}

export interface AiClientSelection {
  client: AiClient;
  reason: string;
}

export function getAiClient(forceFallback = false): AiClientSelection {
  const env = getEnv();

  if (forceFallback) {
    return { client: new FallbackAiClient(), reason: 'forced by --fallback flag' };
  }

  if (env.AI_PROVIDER === 'openai') {
    if (env.OPENAI_API_KEY) {
      return { client: new RemoteAiClient('openai', callOpenAi), reason: 'AI_PROVIDER=openai' };
    }
    logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY is empty; using local fallback.');
    return { client: new FallbackAiClient(), reason: 'openai selected but no API key' };
  }

  if (env.AI_PROVIDER === 'anthropic') {
    if (env.ANTHROPIC_API_KEY) {
      return {
        client: new RemoteAiClient('anthropic', callAnthropic),
        reason: 'AI_PROVIDER=anthropic',
      };
    }
    logger.warn('AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is empty; using local fallback.');
    return { client: new FallbackAiClient(), reason: 'anthropic selected but no API key' };
  }

  if (env.AI_PROVIDER === 'gemini') {
    if (env.GEMINI_API_KEY) {
      return {
        client: new RemoteAiClient('gemini', callGemini),
        reason: 'AI_PROVIDER=gemini',
      };
    }
    logger.warn('AI_PROVIDER=gemini but GEMINI_API_KEY is empty; using local fallback.');
    return { client: new FallbackAiClient(), reason: 'gemini selected but no API key' };
  }

  return { client: new FallbackAiClient(), reason: 'AI_PROVIDER=fallback (default)' };
}
