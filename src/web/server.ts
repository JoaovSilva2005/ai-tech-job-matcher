import path from 'path';
import fs from 'fs';
import express, { Request, Response } from 'express';
import multer from 'multer';
import { runPipeline } from '../index';
import type { CliOptions, SelectableSource, WorkModeFilter } from '../cli/cliTypes';
import { VALID_ROLES, SELECTABLE_SOURCES, VALID_WORK_MODES } from '../cli/cliTypes';
import type { JobMatchResult } from '../matcher/calculateMatchScore';
import type { TechRole } from '../scraper/types';
import { ensureDir } from '../utils/fileSystem';
import { setDebug } from '../utils/logger';
import { SUPPORTED_RESUME_EXTENSIONS } from '../resume/parseResume';
import { indexHtml } from './page';

const PORT = Number(process.env.PORT ?? 4180);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const UPLOAD_DIR = path.join(PROJECT_ROOT, 'uploads');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output', 'web');

ensureDir(UPLOAD_DIR);
ensureDir(OUTPUT_DIR);
setDebug(false);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.txt';
    cb(null, `resume-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, SUPPORTED_RESUME_EXTENSIONS.includes(ext as (typeof SUPPORTED_RESUME_EXTENSIONS)[number]));
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
  });
});

app.post('/api/analyze', upload.single('resume'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res
      .status(400)
      .json({ error: `No resume uploaded. Accepted formats: ${SUPPORTED_RESUME_EXTENSIONS.join(', ')}` });
  }

  const role = normalizeRole(req.body.role);
  const source = normalizeSource(req.body.source);
  const workMode = normalizeWorkMode(req.body.workMode);
  const userLocation = normalizeUserLocation(req.body.userLocation);
  const limit = normalizeLimit(req.body.limit);

  const options: CliOptions = {
    resume: file.path,
    role,
    source,
    workMode,
    userLocation,
    limit,
    output: OUTPUT_DIR,
    fallback: false, // runPipeline auto-degrades to local fallback when no API key
    debug: false,
  };

  try {
    const result = await runPipeline(options);
    const resumeAnalysis = readJson(result.outputFiles.resumeAnalysis);

    res.json({
      summary: result.summary,
      resumeAnalysis,
      matches: result.matches.map(toClientMatch),
      downloadUrl: '/api/download/excel',
      markdownUrl: '/api/download/summary',
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  } finally {
    // Privacy: never keep the uploaded resume on disk after analysis
    fs.promises.unlink(file.path).catch(() => undefined);
  }
});

app.get('/api/download/excel', (_req: Request, res: Response) => {
  const filePath = path.join(OUTPUT_DIR, 'job-match-report.xlsx');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Run an analysis first.' });
  }
  res.download(filePath, 'job-match-report.xlsx');
});

app.get('/api/download/summary', (_req: Request, res: Response) => {
  const filePath = path.join(OUTPUT_DIR, 'execution-summary.md');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Run an analysis first.' });
  }
  res.download(filePath, 'execution-summary.md');
});

function normalizeRole(value: unknown): TechRole {
  const role = String(value ?? 'all').toLowerCase() as TechRole;
  return VALID_ROLES.includes(role) ? role : 'all';
}

function normalizeSource(value: unknown): SelectableSource {
  const source = String(value ?? 'gupy').toLowerCase() as SelectableSource;
  return SELECTABLE_SOURCES.includes(source as (typeof SELECTABLE_SOURCES)[number])
    ? source
    : 'gupy';
}

function normalizeWorkMode(value: unknown): WorkModeFilter {
  const workMode = String(value ?? 'all').toLowerCase() as WorkModeFilter;
  return VALID_WORK_MODES.includes(workMode) ? workMode : 'all';
}

function normalizeUserLocation(value: unknown): string {
  return String(value ?? '').trim().slice(0, 120);
}

function normalizeLimit(value: unknown): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return 16;
  return limit;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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
    seniority: m.analysis.seniorityLevel,
    englishLevel: m.analysis.englishLevel,
    matchedSkills: m.matchedSkills,
    missingSkills: m.missingSkills,
    criticalGaps: m.criticalGaps,
    explanation: m.explanation,
    studyPlan: m.studyPlan,
  };
}

app.listen(PORT, () => {
  console.log(`AI Tech Job Matcher web UI running at http://localhost:${PORT}`);
});
