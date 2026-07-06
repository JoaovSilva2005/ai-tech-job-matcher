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
  'all',
  'unknown',
]);

/** Zod schema used to validate AI responses for job analysis. */
export const jobAnalysisSchema = z.object({
  normalizedTitle: z.string().catch(''),
  role: roleSchema.catch('unknown'),
  seniorityLevel: senioritySchema.catch('unknown'),
  requiredSkills: z.array(z.string()).catch([]),
  niceToHaveSkills: z.array(z.string()).catch([]),
  tools: z.array(z.string()).catch([]),
  programmingLanguages: z.array(z.string()).catch([]),
  frameworks: z.array(z.string()).catch([]),
  automationTools: z.array(z.string()).catch([]),
  apiTools: z.array(z.string()).catch([]),
  englishRequired: z.boolean().catch(false),
  englishLevel: levelSchema.catch('unknown'),
  testingRequired: z.boolean().catch(false),
  apiTestingRequired: z.boolean().catch(false),
  automationRequired: z.boolean().catch(false),
  juniorFriendly: z.boolean().catch(false),
  summary: z.string().catch(''),
  redFlags: z.array(z.string()).catch([]),
  recommendedStudyTopics: z.array(z.string()).catch([]),
  fallbackMode: z.boolean().catch(false),
});
