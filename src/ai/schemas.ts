import { z } from 'zod';
import type { EnglishLevel, SeniorityLevel, TechRole } from '../scraper/types';

export interface JobAnalysis {
  normalizedTitle: string;
  role: TechRole;
  seniorityLevel: SeniorityLevel;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  tools: string[];
  programmingLanguages: string[];
  frameworks: string[];
  automationTools: string[];
  apiTools: string[];
  englishRequired: boolean;
  englishLevel: EnglishLevel;
  testingRequired: boolean;
  apiTestingRequired: boolean;
  automationRequired: boolean;
  juniorFriendly: boolean;
  summary: string;
  redFlags: string[];
  recommendedStudyTopics: string[];
  fallbackMode: boolean;
}

const levelSchema = z.enum(['basic', 'intermediate', 'advanced', 'fluent', 'unknown']);
const senioritySchema = z.enum(['intern', 'junior', 'mid', 'senior', 'unknown']);
const roleSchema = z.enum([
  'qa',
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'data',
  'devops',
  'support',
  'internship',
  'unknown',
]);

const shortText = z.string().trim().min(1).max(200);
const textList = z.array(shortText).max(100);

/** Zod schema used to validate AI responses for job analysis. */
export const jobAnalysisSchema = z
  .object({
    normalizedTitle: z.string().trim().min(2).max(200),
    role: roleSchema,
    seniorityLevel: senioritySchema,
    requiredSkills: textList,
    niceToHaveSkills: textList,
    tools: textList,
    programmingLanguages: textList,
    frameworks: textList,
    automationTools: textList,
    apiTools: textList,
    englishRequired: z.boolean(),
    englishLevel: levelSchema,
    testingRequired: z.boolean(),
    apiTestingRequired: z.boolean(),
    automationRequired: z.boolean(),
    juniorFriendly: z.boolean(),
    summary: z.string().trim().min(20).max(2000),
    redFlags: z.array(z.string().trim().min(3).max(500)).max(20),
    recommendedStudyTopics: textList,
    fallbackMode: z.boolean(),
  })
  .strict()
  .superRefine((analysis, context) => {
    const signals =
      analysis.requiredSkills.length +
      analysis.tools.length +
      analysis.programmingLanguages.length +
      analysis.frameworks.length;
    if (analysis.role === 'unknown' && signals === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Job analysis has no usable role or requirement signal',
      });
    }
  });
