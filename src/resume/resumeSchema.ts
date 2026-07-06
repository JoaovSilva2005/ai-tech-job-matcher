import { z } from 'zod';
import type { EnglishLevel, SeniorityLevel, TechRole } from '../scraper/types';

export interface ParsedResume {
  sourcePath: string;
  format: 'txt' | 'pdf' | 'docx';
  text: string;
  characterCount: number;
}

export interface ResumeLanguage {
  language: string;
  level: EnglishLevel;
}

export interface ResumeAnalysis {
  candidateName?: string;
  detectedSeniority: SeniorityLevel;
  targetRoles: TechRole[];
  technicalSkills: string[];
  qaSkills: string[];
  developmentSkills: string[];
  dataSkills: string[];
  devopsSkills: string[];
  supportSkills: string[];
  tools: string[];
  languages: ResumeLanguage[];
  strengths: string[];
  improvementAreas: string[];
  summary: string;
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

/** Zod schema used to validate AI responses for resume analysis. */
export const resumeAnalysisSchema = z.object({
  candidateName: z.string().optional(),
  detectedSeniority: senioritySchema.catch('unknown'),
  targetRoles: z.array(roleSchema).catch([]),
  technicalSkills: z.array(z.string()).catch([]),
  qaSkills: z.array(z.string()).catch([]),
  developmentSkills: z.array(z.string()).catch([]),
  dataSkills: z.array(z.string()).catch([]),
  devopsSkills: z.array(z.string()).catch([]),
  supportSkills: z.array(z.string()).catch([]),
  tools: z.array(z.string()).catch([]),
  languages: z
    .array(z.object({ language: z.string(), level: levelSchema.catch('unknown') }))
    .catch([]),
  strengths: z.array(z.string()).catch([]),
  improvementAreas: z.array(z.string()).catch([]),
  summary: z.string().catch(''),
  fallbackMode: z.boolean().catch(false),
});
