import { z } from 'zod';
import type { EnglishLevel, SeniorityLevel, TechRole } from '../scraper/types';

export interface ParsedResume {
  sourcePath: string;
  format: 'txt' | 'md' | 'pdf' | 'docx';
  text: string;
  characterCount: number;
}

export interface ResumeLanguage {
  language: string;
  level: EnglishLevel;
}

export interface ResumeAnalysis {
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
  'unknown',
]);

const shortText = z.string().trim().min(1).max(200);
const textList = z.array(shortText).max(100);

/** Zod schema used to validate AI responses for resume analysis. */
export const resumeAnalysisSchema = z
  .object({
    detectedSeniority: senioritySchema,
    targetRoles: z.array(roleSchema).min(1).max(10),
    technicalSkills: textList,
    qaSkills: textList,
    developmentSkills: textList,
    dataSkills: textList,
    devopsSkills: textList,
    supportSkills: textList,
    tools: textList,
    languages: z.array(z.object({ language: shortText, level: levelSchema }).strict()).max(20),
    strengths: z.array(z.string().trim().min(3).max(500)).min(1).max(20),
    improvementAreas: z.array(z.string().trim().min(3).max(500)).max(20),
    summary: z.string().trim().min(20).max(2000),
    fallbackMode: z.boolean(),
  })
  .strict()
  .superRefine((analysis, context) => {
    const skillCount =
      analysis.technicalSkills.length +
      analysis.qaSkills.length +
      analysis.developmentSkills.length +
      analysis.dataSkills.length +
      analysis.devopsSkills.length +
      analysis.supportSkills.length +
      analysis.tools.length;
    if (skillCount === 0 && analysis.targetRoles.every((role) => role === 'unknown')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Resume analysis has no usable role or skill signal',
      });
    }
  });
