import path from 'path';
import { CliError, parseArgs, printUsage } from './cli/parseArgs';
import type { CliOptions } from './cli/cliTypes';
import { parseResume } from './resume/parseResume';
import { sanitizeResumeText } from './resume/sanitizeResume';
import { analyzeResume } from './resume/analyzeResume';
import { getAiClient } from './ai/aiClient';
import type { JobAnalysis } from './ai/schemas';
import { scrapeJobs } from './scraper/jobScraper';
import { validateJob } from './scraper/validateJob';
import type { JobValidationResult, ScrapedJob, TechRole } from './scraper/types';
import { removeDuplicateJobs } from './qa/duplicateDetector';
import { detectSeniorityMismatch } from './qa/detectJobIssues';
import { calculateDataQualityScore } from './qa/dataQualityScore';
import { calculateMatchScore, JobMatchResult } from './matcher/calculateMatchScore';
import { generateExcelReport } from './reports/generateExcelReport';
import { generateMarkdownSummary } from './reports/generateMarkdownSummary';
import type { ExecutionSummary, ReportData, SkillInsight } from './reports/reportTypes';
import { ensureDir, writeJsonFile } from './utils/fileSystem';
import { logger, setDebug } from './utils/logger';
import { nowIso } from './utils/date';

export interface PipelineResult {
  matches: JobMatchResult[];
  summary: ExecutionSummary;
  outputFiles: {
    excel: string;
    markdown: string;
    jobsRaw: string;
    jobsAnalyzed: string;
    resumeAnalysis: string;
    jobMatches: string;
  };
}

const TOTAL_STEPS = 12;

export async function runPipeline(options: CliOptions): Promise<PipelineResult> {
  const startedAt = Date.now();
  setDebug(options.debug);
  const outputDir = path.resolve(options.output);
  ensureDir(outputDir);

  // 1. Read resume
  logger.step(1, TOTAL_STEPS, `Reading resume: ${options.resume}`);
  const parsedResume = await parseResume(options.resume);
  logger.info(`Resume parsed (${parsedResume.format}, ${parsedResume.characterCount} chars).`);

  // 2. Sanitize sensitive data (before anything is logged or sent anywhere)
  logger.step(2, TOTAL_STEPS, 'Sanitizing personal data (emails, phones, documents)...');
  const sanitizedResumeText = sanitizeResumeText(parsedResume.text);

  // 3. Analyze resume (AI or local fallback)
  const { client: aiClient, reason } = getAiClient(options.fallback);
  logger.step(3, TOTAL_STEPS, `Analyzing resume with "${aiClient.providerName}" (${reason})...`);
  const resumeAnalysis = await analyzeResume(sanitizedResumeText, aiClient);

  // 4. Collect jobs
  logger.step(4, TOTAL_STEPS, `Collecting jobs from "${options.source}"...`);
  const scrapedJobs = await scrapeJobs(options.source, {
    limit: options.limit,
    debug: options.debug,
    role: options.role,
  });
  if (scrapedJobs.length === 0) {
    logger.warn('No jobs collected. Reports will be generated empty.');
  }

  // 5. Validate job data (QA gate)
  logger.step(5, TOTAL_STEPS, 'Validating scraped job data...');
  const validations = new Map<string, JobValidationResult>();
  for (const job of scrapedJobs) {
    validations.set(job.id, validateJob(job));
  }
  const invalidJobs = scrapedJobs.filter((j) => !validations.get(j.id)?.isValid);
  if (invalidJobs.length > 0) {
    logger.warn(`${invalidJobs.length} job(s) failed validation and will be excluded from ranking.`);
  }

  // 6. Remove duplicates
  logger.step(6, TOTAL_STEPS, 'Removing duplicate jobs...');
  const validJobs = scrapedJobs.filter((j) => validations.get(j.id)?.isValid);
  const { unique: uniqueJobs, duplicates } = removeDuplicateJobs(validJobs);
  if (duplicates.length > 0) {
    logger.info(`Removed ${duplicates.length} duplicate job(s).`);
  }

  // 7. Analyze jobs with AI or fallback
  logger.step(7, TOTAL_STEPS, `Analyzing ${uniqueJobs.length} job(s) with "${aiClient.providerName}"...`);
  const analyses = new Map<string, JobAnalysis>();
  for (const job of uniqueJobs) {
    analyses.set(job.id, await aiClient.analyzeJob(job));
  }

  // Filter by requested role AFTER analysis so the classification is consistent
  const roleFilteredJobs = filterByRole(uniqueJobs, analyses, options.role);
  logger.info(`${roleFilteredJobs.length} job(s) match the requested role "${options.role}".`);

  // 8. Compare resume x jobs + 9. Ranking
  logger.step(8, TOTAL_STEPS, 'Calculating match scores...');
  const matches: JobMatchResult[] = roleFilteredJobs.map((job) => {
    const analysis = analyses.get(job.id)!;
    const validation = validations.get(job.id)!;
    // QA cross-check: seniority above candidate level becomes a QA issue
    const mismatch = detectSeniorityMismatch(analysis.seniorityLevel, resumeAnalysis.detectedSeniority);
    if (mismatch) {
      validation.issues.push(mismatch);
      validation.dataQualityScore = calculateDataQualityScore(validation.issues);
    }
    return calculateMatchScore(resumeAnalysis, job, analysis, validation);
  });

  logger.step(9, TOTAL_STEPS, 'Ranking jobs by match score...');
  matches.sort((a, b) => b.score - a.score);

  const summary: ExecutionSummary = {
    executedAt: nowIso(),
    resumeFile: options.resume,
    role: options.role,
    source: options.source,
    aiProvider: aiClient.providerName,
    usedFallback: aiClient.isFallback,
    jobsCollected: scrapedJobs.length,
    jobsValid: [...validations.values()].filter((v) => v.status === 'valid').length,
    jobsNeedingReview: [...validations.values()].filter((v) => v.status === 'needs_review').length,
    jobsInvalid: [...validations.values()].filter((v) => v.status === 'invalid').length,
    duplicatesRemoved: duplicates.length,
    jobsAfterRoleFilter: roleFilteredJobs.length,
    durationMs: Date.now() - startedAt,
  };

  const reportData: ReportData = {
    matches,
    resume: resumeAnalysis,
    summary,
    skillInsights: buildSkillInsights(matches),
  };

  // 10. Excel report
  logger.step(10, TOTAL_STEPS, 'Generating Excel report...');
  const excelPath = await generateExcelReport(reportData, outputDir);

  // 11. Markdown summary
  logger.step(11, TOTAL_STEPS, 'Generating Markdown summary...');
  summary.durationMs = Date.now() - startedAt;
  const markdownPath = generateMarkdownSummary(reportData, outputDir);

  // 12. Intermediate JSON files (raw + analyzed + matches).
  // Privacy note: only the structured resume ANALYSIS is saved, never the resume text.
  logger.step(12, TOTAL_STEPS, 'Saving intermediate JSON files...');
  const jobsRawPath = path.join(outputDir, 'jobs-raw.json');
  const jobsAnalyzedPath = path.join(outputDir, 'jobs-analyzed.json');
  const resumeAnalysisPath = path.join(outputDir, 'resume-analysis.json');
  const jobMatchesPath = path.join(outputDir, 'job-matches.json');

  writeJsonFile(jobsRawPath, scrapedJobs);
  writeJsonFile(
    jobsAnalyzedPath,
    uniqueJobs.map((job) => ({
      job: { id: job.id, title: job.title, company: job.company, url: job.url },
      validation: validations.get(job.id),
      analysis: analyses.get(job.id),
    }))
  );
  writeJsonFile(resumeAnalysisPath, resumeAnalysis);
  writeJsonFile(
    jobMatchesPath,
    matches.map((m) => ({
      rank: matches.indexOf(m) + 1,
      score: m.score,
      recommendation: m.recommendation,
      jobId: m.job.id,
      title: m.job.title,
      company: m.job.company,
      url: m.job.url,
      matchedSkills: m.matchedSkills,
      missingSkills: m.missingSkills,
      criticalGaps: m.criticalGaps,
      explanation: m.explanation,
      studyPlan: m.studyPlan,
    }))
  );

  logger.info(`Done in ${(summary.durationMs / 1000).toFixed(1)}s. Reports saved to ${outputDir}`);
  logger.info(`  Excel:    ${excelPath}`);
  logger.info(`  Summary:  ${markdownPath}`);

  return {
    matches,
    summary,
    outputFiles: {
      excel: excelPath,
      markdown: markdownPath,
      jobsRaw: jobsRawPath,
      jobsAnalyzed: jobsAnalyzedPath,
      resumeAnalysis: resumeAnalysisPath,
      jobMatches: jobMatchesPath,
    },
  };
}

function filterByRole(
  jobs: ScrapedJob[],
  analyses: Map<string, JobAnalysis>,
  role: TechRole
): ScrapedJob[] {
  if (role === 'all') return jobs;
  return jobs.filter((job) => {
    const analysis = analyses.get(job.id);
    if (!analysis) return false;
    if (role === 'internship') {
      return analysis.role === 'internship' || analysis.seniorityLevel === 'intern';
    }
    return analysis.role === role;
  });
}

function buildSkillInsights(matches: JobMatchResult[]): SkillInsight[] {
  const counts = new Map<string, { mentions: number; roles: Map<TechRole, number> }>();

  for (const match of matches) {
    const skills = [...match.analysis.requiredSkills, ...match.analysis.niceToHaveSkills];
    for (const skill of skills) {
      const entry = counts.get(skill) ?? { mentions: 0, roles: new Map<TechRole, number>() };
      entry.mentions += 1;
      entry.roles.set(match.analysis.role, (entry.roles.get(match.analysis.role) ?? 0) + 1);
      counts.set(skill, entry);
    }
  }

  return [...counts.entries()]
    .map(([skill, entry]) => {
      const sortedRoles = [...entry.roles.entries()].sort((a, b) => b[1] - a[1]);
      const dominant = sortedRoles[0];
      const relatedRole: SkillInsight['relatedRole'] =
        sortedRoles.length > 1 && sortedRoles[1][1] === dominant[1] ? 'multiple' : dominant[0];
      return { skill, mentions: entry.mentions, relatedRole };
    })
    .sort((a, b) => b.mentions - a.mentions);
}

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    await runPipeline(options);
  } catch (error) {
    if (error instanceof CliError) {
      logger.error(error.message);
      printUsage();
    } else {
      logger.error((error as Error).message);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
