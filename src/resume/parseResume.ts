import fs from 'fs';
import { fileExists, getExtension, readTextFile } from '../utils/fileSystem';
import { ParsedResume } from './resumeSchema';

export class ResumeParseError extends Error {}

export const SUPPORTED_RESUME_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx'] as const;
export const MAX_RESUME_CHARACTERS = 100_000;

export async function parseResume(filePath: string): Promise<ParsedResume> {
  if (!fileExists(filePath)) {
    throw new ResumeParseError(`Resume file not found: ${filePath}`);
  }

  const ext = getExtension(filePath);
  if (!SUPPORTED_RESUME_EXTENSIONS.includes(ext as (typeof SUPPORTED_RESUME_EXTENSIONS)[number])) {
    throw new ResumeParseError(
      `Unsupported resume format "${ext}". Supported formats: ${SUPPORTED_RESUME_EXTENSIONS.join(', ')}`
    );
  }

  let text: string;
  let format: ParsedResume['format'];

  if (ext === '.txt' || ext === '.md') {
    text = readTextFile(filePath);
    format = ext === '.md' ? 'md' : 'txt';
  } else if (ext === '.pdf') {
    text = await parsePdf(filePath);
    format = 'pdf';
  } else {
    text = await parseDocx(filePath);
    format = 'docx';
  }

  const trimmed = text.trim();
  if (trimmed.length < 30) {
    throw new ResumeParseError(
      'Resume text is too short to analyze (less than 30 characters). Check the file content.'
    );
  }
  if (trimmed.length > MAX_RESUME_CHARACTERS) {
    throw new ResumeParseError(
      `Resume text is too large to analyze (${trimmed.length} characters, maximum ${MAX_RESUME_CHARACTERS}).`
    );
  }

  return {
    sourcePath: filePath,
    format,
    text: trimmed,
    characterCount: trimmed.length,
  };
}

async function parsePdf(filePath: string): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = fs.readFileSync(filePath);
  try {
    const result = await pdfParse(buffer);
    return result.text;
  } catch (error) {
    throw new ResumeParseError(`Failed to parse PDF resume: ${(error as Error).message}`);
  }
}

async function parseDocx(filePath: string): Promise<string> {
  const mammoth = await import('mammoth');
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new ResumeParseError(`Failed to parse DOCX resume: ${(error as Error).message}`);
  }
}
