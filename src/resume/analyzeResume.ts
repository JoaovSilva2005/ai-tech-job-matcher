import type { AiClient } from '../ai/aiClient';
import { normalizeSkills } from '../matcher/normalizeSkills';
import { logger } from '../utils/logger';
import type { ResumeAnalysis } from './resumeSchema';
import { sanitizeResumeText } from './sanitizeResume';

/**
 * Analyzes the resume text with the configured AI client (or the local
 * fallback). The text is sanitized BEFORE being sent to any external API,
 * so personal contact data never leaves the machine.
 */
export async function analyzeResume(
  resumeText: string,
  aiClient: AiClient
): Promise<ResumeAnalysis> {
  const sanitized = sanitizeResumeText(resumeText);
  logger.debug(`Analyzing resume with provider "${aiClient.providerName}"`);

  const analysis = await aiClient.analyzeResume(sanitized);

  // Normalize skill spellings regardless of who produced the analysis
  return {
    ...analysis,
    technicalSkills: normalizeSkills(analysis.technicalSkills),
    qaSkills: normalizeSkills(analysis.qaSkills),
    developmentSkills: normalizeSkills(analysis.developmentSkills),
    dataSkills: normalizeSkills(analysis.dataSkills),
    devopsSkills: normalizeSkills(analysis.devopsSkills),
    supportSkills: normalizeSkills(analysis.supportSkills),
    tools: normalizeSkills(analysis.tools),
  };
}
