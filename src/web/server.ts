import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import type { Server } from 'http';
import { runPipeline } from '../index';
import type { CliOptions, ManualJobInput, SelectableSource, WorkModeFilter } from '../cli/cliTypes';
import { VALID_ROLES, VALID_SOURCES, SELECTABLE_SOURCES, VALID_WORK_MODES } from '../cli/cliTypes';
import type { JobMatchResult } from '../matcher/calculateMatchScore';
import type { TechRole, WorkMode } from '../scraper/types';
import { ensureDir } from '../utils/fileSystem';
import { logger, setDebug } from '../utils/logger';
import { ResumeParseError, SUPPORTED_RESUME_EXTENSIONS } from '../resume/parseResume';
import { isLikelyRealJobUrl } from '../utils/url';
import { SourceUnavailableError } from '../scraper/sourceErrors';
import { getSourceConfiguration } from '../scraper/sourceRegistry';
import { indexHtml } from './page';

const PORT = Number(process.env.PORT ?? 4180);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const UPLOAD_DIR = path.join(PROJECT_ROOT, 'uploads');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output', 'web');
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_FORM_FIELD_BYTES = 64 * 1024;
const DEFAULT_REPORT_TTL_MS = 30 * 60 * 1000;
const RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DOWNLOADS = {
  excel: { filename: 'job-match-report.xlsx', downloadName: 'job-match-report.xlsx' },
  summary: { filename: 'execution-summary.md', downloadName: 'execution-summary.md' },
} as const;

setDebug(false);

export interface WebAppOptions {
  uploadDir?: string;
  outputDir?: string;
  reportTtlMs?: number;
  now?: () => number;
}

type AnalysisMode = 'search' | 'specific';

class RequestValidationError extends Error {}

class UnsupportedResumeError extends Error {}

export function createApp(options: WebAppOptions = {}): express.Application {
  const uploadDir = options.uploadDir ?? UPLOAD_DIR;
  const outputDir = options.outputDir ?? OUTPUT_DIR;
  const reportTtlMs = options.reportTtlMs ?? DEFAULT_REPORT_TTL_MS;
  const now = options.now ?? Date.now;

  ensureDir(uploadDir);
  ensureDir(outputDir);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.txt';
      cb(null, `resume-${randomUUID()}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      fieldSize: MAX_FORM_FIELD_BYTES,
      fields: 20,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (
        !SUPPORTED_RESUME_EXTENSIONS.includes(ext as (typeof SUPPORTED_RESUME_EXTENSIONS)[number])
      ) {
        cb(
          new UnsupportedResumeError(
            `Unsupported resume format "${ext || '(none)'}". Accepted formats: ${SUPPORTED_RESUME_EXTENSIONS.join(', ')}`
          )
        );
        return;
      }
      cb(null, true);
    },
  });

  const app = express();

  app.get('/', (_req: Request, res: Response) => {
    res.type('html').send(indexHtml());
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      roles: VALID_ROLES,
      sources: SELECTABLE_SOURCES,
      workModes: VALID_WORK_MODES,
      sourceConfiguration: Object.fromEntries(
        VALID_SOURCES.map((source) => [source, getSourceConfiguration(source)])
      ),
    });
  });

  app.post('/api/analyze', upload.single('resume'), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: `No resume uploaded. Accepted formats: ${SUPPORTED_RESUME_EXTENSIONS.join(', ')}`,
      });
    }

    let runOutputDir: string | undefined;
    try {
      cleanupExpiredReportRuns(outputDir, now(), reportTtlMs);

      const analysisMode = normalizeAnalysisMode(req.body.analysisMode, req.body.jobDescription);
      const role = normalizeRole(req.body.role);
      const source = normalizeSource(req.body.source);
      const userLocation = normalizeUserLocation(req.body.userLocation);
      const manualJob = analysisMode === 'specific' ? normalizeManualJob(req.body) : undefined;
      const workMode = analysisMode === 'specific' ? 'all' : normalizeWorkMode(req.body.workMode);
      const limit = analysisMode === 'specific' ? 1 : normalizeLimit(req.body.limit);
      const runId = randomUUID();
      runOutputDir = path.join(outputDir, runId);

      const pipelineOptions: CliOptions = {
        resume: file.path,
        role,
        source,
        workMode,
        userLocation,
        manualJob,
        limit,
        output: runOutputDir,
        fallback: false, // runPipeline auto-degrades to local fallback when no API key
        debug: false,
      };

      const result = await runPipeline(pipelineOptions);
      const resumeAnalysis = readJson(result.outputFiles.resumeAnalysis);

      res.json({
        runId,
        summary: result.summary,
        resumeAnalysis,
        matches: result.matches.map(toClientMatch),
        downloadUrl: `/api/runs/${runId}/download/excel`,
        markdownUrl: `/api/runs/${runId}/download/summary`,
        expiresAt: new Date(now() + reportTtlMs).toISOString(),
      });
    } catch (error) {
      if (runOutputDir) {
        fs.rmSync(runOutputDir, { recursive: true, force: true });
      }
      const status = errorStatus(error);
      if (status === 500) {
        logger.error(`Web analysis failed: ${(error as Error).message}`);
      }
      res.status(status).json({
        error:
          status !== 500
            ? (error as Error).message
            : 'Analysis failed unexpectedly. Check the server logs and try again.',
      });
    } finally {
      // Privacy: never keep the uploaded resume on disk after analysis
      await fs.promises.unlink(file.path).catch(() => undefined);
    }
  });

  app.get('/api/runs/:runId/download/:format', (req: Request, res: Response) => {
    cleanupExpiredReportRuns(outputDir, now(), reportTtlMs);

    const runId = String(req.params.runId);
    const format = String(req.params.format) as keyof typeof DOWNLOADS;
    if (!RUN_ID_PATTERN.test(runId) || !(format in DOWNLOADS)) {
      return res.status(400).json({ error: 'Invalid report download URL.' });
    }

    const download = DOWNLOADS[format];
    const runDir = path.resolve(outputDir, runId);
    const filePath = path.resolve(runDir, download.filename);
    if (!isPathInside(runDir, filePath) || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Report not found or expired.' });
    }
    res.download(filePath, download.downloadName);
  });

  app.use(uploadErrorHandler);

  return app;
}

export function startServer(port = PORT): Server {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`AI Tech Job Matcher web UI running at http://localhost:${port}`);
  });
}

function normalizeRole(value: unknown): TechRole {
  const role = String(value ?? 'all').toLowerCase() as TechRole;
  if (!VALID_ROLES.includes(role)) {
    throw new RequestValidationError(`Invalid role "${role}".`);
  }
  return role;
}

function normalizeSource(value: unknown): SelectableSource {
  const source = String(value ?? 'gupy').toLowerCase() as SelectableSource;
  if (!SELECTABLE_SOURCES.includes(source as (typeof SELECTABLE_SOURCES)[number])) {
    throw new RequestValidationError(`Invalid job source "${source}".`);
  }
  return source;
}

function normalizeWorkMode(value: unknown): WorkModeFilter {
  const workMode = String(value ?? 'all').toLowerCase() as WorkModeFilter;
  if (!VALID_WORK_MODES.includes(workMode)) {
    throw new RequestValidationError(`Invalid work mode "${workMode}".`);
  }
  return workMode;
}

function normalizeUserLocation(value: unknown): string {
  return String(value ?? '')
    .trim()
    .slice(0, 120);
}

function normalizeLimit(value: unknown): number {
  const limit = Number(value ?? 16);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new RequestValidationError('Limit must be an integer between 1 and 50.');
  }
  return limit;
}

function normalizeAnalysisMode(value: unknown, jobDescription: unknown): AnalysisMode {
  const inferred = String(jobDescription ?? '').trim() ? 'specific' : 'search';
  const mode = String(value ?? inferred).toLowerCase();
  if (mode !== 'search' && mode !== 'specific') {
    throw new RequestValidationError(`Invalid analysis mode "${mode}".`);
  }
  return mode;
}

function normalizeManualJob(body: Record<string, unknown>): ManualJobInput {
  const description = String(body.jobDescription ?? '').trim();
  const title = String(body.jobTitle ?? '').trim();
  const company = String(body.jobCompany ?? '').trim();
  const url = String(body.jobUrl ?? '').trim();
  const location = String(body.jobLocation ?? '').trim();
  const workMode = normalizeJobWorkMode(body.jobWorkMode);

  if (!title) throw new RequestValidationError('Specific job title is required.');
  if (!company) throw new RequestValidationError('Specific job company is required.');
  if (!description) throw new RequestValidationError('Specific job description is required.');
  if (description.length < 100) {
    throw new RequestValidationError(
      'Specific job description must contain at least 100 characters.'
    );
  }
  if (!isLikelyRealJobUrl(url)) {
    throw new RequestValidationError(
      'A real HTTP(S) application URL is required for a specific job.'
    );
  }

  return {
    title: title.slice(0, 140),
    company: company.slice(0, 120),
    url,
    location: location.slice(0, 160) || 'Not specified',
    workMode,
    description: description.slice(0, 8000),
  };
}

function normalizeJobWorkMode(value: unknown): WorkMode {
  const workMode = String(value ?? 'unknown').toLowerCase() as WorkMode;
  if (!['remote', 'hybrid', 'onsite', 'unknown'].includes(workMode)) {
    throw new RequestValidationError(`Invalid specific-job work mode "${workMode}".`);
  }
  return workMode;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function uploadErrorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'Resume file is too large. Maximum size is 5 MB.' });
    return;
  }

  if (error instanceof UnsupportedResumeError || error instanceof RequestValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  logger.error(`Unhandled web error: ${(error as Error).message}`);
  res.status(500).json({ error: 'Unexpected server error.' });
}

function errorStatus(error: unknown): number {
  if (error instanceof RequestValidationError || error instanceof ResumeParseError) return 400;
  if (error instanceof SourceUnavailableError) return 503;
  return 500;
}

function isPathInside(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function cleanupExpiredReportRuns(
  outputDir: string,
  nowMs = Date.now(),
  ttlMs = DEFAULT_REPORT_TTL_MS
): string[] {
  if (!fs.existsSync(outputDir)) return [];

  const removed: string[] = [];
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !RUN_ID_PATTERN.test(entry.name)) continue;
    const runDir = path.join(outputDir, entry.name);
    const ageMs = nowMs - fs.statSync(runDir).mtimeMs;
    if (ageMs <= ttlMs) continue;
    fs.rmSync(runDir, { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed;
}

/**
 * Flattens a JobMatchResult into the shape the web UI card expects, exposing
 * the job metadata (location, work mode, source) and the analyzed seniority /
 * English level that the richer card layout renders.
 */
function toClientMatch(m: JobMatchResult) {
  return {
    score: m.score,
    recommendation: m.recommendation,
    title: m.job.title,
    company: m.job.company,
    url: m.job.url,
    source: m.job.source,
    location: m.job.location ?? null,
    locationPreference: m.locationPreference ?? null,
    workMode: m.job.workMode,
    availability: m.job.availability ?? 'unknown',
    publishedAt: m.job.publishedAt ?? null,
    seniority: m.analysis.seniorityLevel,
    englishLevel: m.analysis.englishLevel,
    dataQualityScore: m.validation.dataQualityScore,
    validationStatus: m.validation.status,
    qaIssues: m.validation.issues.map(({ field, severity, message }) => ({
      field,
      severity,
      message,
    })),
    matchedSkills: m.matchedSkills,
    missingSkills: m.missingSkills,
    criticalGaps: m.criticalGaps,
    explanation: m.explanation,
    studyPlan: m.studyPlan,
  };
}

if (require.main === module) {
  startServer();
}
