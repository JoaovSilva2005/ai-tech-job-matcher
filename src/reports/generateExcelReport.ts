import path from 'path';
import ExcelJS from 'exceljs';
import type { ReportData } from './reportTypes';
import {
  applyAutoFilter,
  fillCell,
  RECOMMENDATION_FILLS,
  SEVERITY_FILLS,
  styleHeaderRow,
} from './excelStyles';
import { RECOMMENDATION_LABELS } from '../matcher/recommendation';
import { ensureDir } from '../utils/fileSystem';
import { formatDateHuman } from '../utils/date';

export const EXCEL_REPORT_FILENAME = 'job-match-report.xlsx';

function joinList(items: string[], max = 8): string {
  if (items.length === 0) return '-';
  const shown = items.slice(0, max).join(', ');
  return items.length > max ? `${shown} (+${items.length - max})` : shown;
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

export async function generateExcelReport(data: ReportData, outputDir: string): Promise<string> {
  ensureDir(outputDir);
  const filePath = path.join(outputDir, EXCEL_REPORT_FILENAME);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AI Tech Job Matcher';
  workbook.created = new Date();

  buildRankingSheet(workbook, data);
  buildDetailsSheet(workbook, data);
  buildQaIssuesSheet(workbook, data);
  buildResumeAnalysisSheet(workbook, data);
  buildMarketInsightsSheet(workbook, data);
  buildExecutionSummarySheet(workbook, data);

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

function buildRankingSheet(workbook: ExcelJS.Workbook, data: ReportData): void {
  const sheet = workbook.addWorksheet('Ranking');
  sheet.columns = [
    { header: 'Rank', key: 'rank', width: 7 },
    { header: 'Match Score', key: 'score', width: 12 },
    { header: 'Recommendation', key: 'recommendation', width: 22 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Job Title', key: 'title', width: 34 },
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Work Mode', key: 'workMode', width: 11 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Seniority', key: 'seniority', width: 11 },
    { header: 'English Level', key: 'english', width: 13 },
    { header: 'Testing Required', key: 'testing', width: 15 },
    { header: 'Automation Required', key: 'automation', width: 18 },
    { header: 'API Required', key: 'api', width: 13 },
    { header: 'Matched Skills', key: 'matched', width: 40 },
    { header: 'Missing Skills', key: 'missing', width: 40 },
    { header: 'Critical Gaps', key: 'gaps', width: 30 },
    { header: 'Job URL', key: 'url', width: 45 },
  ];

  // matches are already sorted by score (descending) by the pipeline
  data.matches.forEach((match, index) => {
    const row = sheet.addRow({
      rank: index + 1,
      score: match.score,
      recommendation: RECOMMENDATION_LABELS[match.recommendation],
      role: match.analysis.role,
      title: match.job.title,
      company: match.job.company,
      workMode: match.job.workMode,
      location: match.job.location ?? '-',
      seniority: match.analysis.seniorityLevel,
      english: match.analysis.englishRequired ? match.analysis.englishLevel : 'not required',
      testing: yesNo(match.analysis.testingRequired),
      automation: yesNo(match.analysis.automationRequired),
      api: yesNo(match.analysis.apiTestingRequired),
      matched: joinList(match.matchedSkills),
      missing: joinList(match.missingSkills),
      gaps: joinList(match.criticalGaps),
      url: match.job.url,
    });
    fillCell(row.getCell('recommendation'), RECOMMENDATION_FILLS[match.recommendation]);
    row.getCell('score').alignment = { horizontal: 'center' };
    row.getCell('rank').alignment = { horizontal: 'center' };
  });

  styleHeaderRow(sheet);
  applyAutoFilter(sheet, 'Q');
}

function buildDetailsSheet(workbook: ExcelJS.Workbook, data: ReportData): void {
  const sheet = workbook.addWorksheet('Details');
  sheet.columns = [
    { header: 'Job Title', key: 'title', width: 34 },
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Summary', key: 'summary', width: 50 },
    { header: 'Required Skills', key: 'required', width: 40 },
    { header: 'Nice to Have Skills', key: 'nice', width: 32 },
    { header: 'Tools', key: 'tools', width: 26 },
    { header: 'Languages', key: 'languages', width: 22 },
    { header: 'Frameworks', key: 'frameworks', width: 24 },
    { header: 'Red Flags', key: 'redFlags', width: 40 },
    { header: 'Study Topics', key: 'study', width: 36 },
    { header: 'Explanation', key: 'explanation', width: 60 },
  ];

  for (const match of data.matches) {
    const row = sheet.addRow({
      title: match.job.title,
      company: match.job.company,
      role: match.analysis.role,
      summary: match.analysis.summary,
      required: joinList(match.analysis.requiredSkills, 12),
      nice: joinList(match.analysis.niceToHaveSkills, 10),
      tools: joinList(match.analysis.tools),
      languages: joinList(match.analysis.programmingLanguages),
      frameworks: joinList(match.analysis.frameworks),
      redFlags: joinList(match.analysis.redFlags, 5),
      study: joinList(match.studyPlan),
      explanation: match.explanation,
    });
    row.alignment = { vertical: 'top', wrapText: true };
  }

  styleHeaderRow(sheet);
  applyAutoFilter(sheet, 'L');
}

function buildQaIssuesSheet(workbook: ExcelJS.Workbook, data: ReportData): void {
  const sheet = workbook.addWorksheet('QA Issues');
  sheet.columns = [
    { header: 'Job Title', key: 'title', width: 34 },
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Field', key: 'field', width: 14 },
    { header: 'Severity', key: 'severity', width: 10 },
    { header: 'Issue Message', key: 'message', width: 60 },
    { header: 'Data Quality Score', key: 'quality', width: 17 },
    { header: 'Status', key: 'status', width: 14 },
  ];

  for (const match of data.matches) {
    for (const issue of match.validation.issues) {
      const row = sheet.addRow({
        title: match.job.title || '(empty title)',
        company: match.job.company || '(empty company)',
        field: issue.field,
        severity: issue.severity,
        message: issue.message,
        quality: match.validation.dataQualityScore,
        status: match.validation.status,
      });
      fillCell(row.getCell('severity'), SEVERITY_FILLS[issue.severity]);
    }
  }

  if (sheet.rowCount === 1) {
    sheet.addRow({ title: 'No QA issues detected', quality: 100, status: 'valid' });
  }

  styleHeaderRow(sheet);
  applyAutoFilter(sheet, 'G');
}

function buildResumeAnalysisSheet(workbook: ExcelJS.Workbook, data: ReportData): void {
  const sheet = workbook.addWorksheet('Resume Analysis');
  sheet.columns = [
    { header: 'Category', key: 'category', width: 26 },
    { header: 'Value', key: 'value', width: 90 },
  ];

  const resume = data.resume;
  // Privacy: only aggregated analysis goes to the report — never the resume text
  const rows: Array<[string, string]> = [
    ['Detected Seniority', resume.detectedSeniority],
    ['Target Roles', joinList(resume.targetRoles, 10)],
    ['Technical Skills', joinList(resume.technicalSkills, 20)],
    ['QA Skills', joinList(resume.qaSkills, 20)],
    ['Development Skills', joinList(resume.developmentSkills, 20)],
    ['Data Skills', joinList(resume.dataSkills, 20)],
    ['DevOps Skills', joinList(resume.devopsSkills, 20)],
    ['Support Skills', joinList(resume.supportSkills, 20)],
    ['Tools', joinList(resume.tools, 20)],
    ['Languages', resume.languages.map((l) => `${l.language} (${l.level})`).join(', ') || '-'],
    ['Strengths', joinList(resume.strengths, 10)],
    ['Improvement Areas', joinList(resume.improvementAreas, 10)],
    ['Summary', resume.summary],
    ['Analysis Mode', resume.fallbackMode ? 'Local fallback (keyword-based)' : 'AI-powered'],
  ];

  for (const [category, value] of rows) {
    const row = sheet.addRow({ category, value });
    row.getCell('category').font = { bold: true };
    row.alignment = { vertical: 'top', wrapText: true };
  }

  styleHeaderRow(sheet);
}

function buildMarketInsightsSheet(workbook: ExcelJS.Workbook, data: ReportData): void {
  const sheet = workbook.addWorksheet('Market Insights');
  sheet.columns = [
    { header: 'Skill', key: 'skill', width: 26 },
    { header: 'Mentions', key: 'mentions', width: 10 },
    { header: 'Related Role', key: 'role', width: 16 },
  ];

  for (const insight of data.skillInsights) {
    sheet.addRow({
      skill: insight.skill,
      mentions: insight.mentions,
      role: insight.relatedRole,
    });
  }

  styleHeaderRow(sheet);
  applyAutoFilter(sheet, 'C');
}

function buildExecutionSummarySheet(workbook: ExcelJS.Workbook, data: ReportData): void {
  const sheet = workbook.addWorksheet('Execution Summary');
  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 32 },
    { header: 'Value', key: 'value', width: 60 },
  ];

  const s = data.summary;
  const rows: Array<[string, string | number]> = [
    ['Executed At', formatDateHuman(new Date(s.executedAt))],
    ['Resume File', path.basename(s.resumeFile)],
    ['Selected Role', s.role],
    ['Job Source', s.source],
    ['AI Provider', s.aiProvider],
    ['Used Fallback Mode', s.usedFallback ? 'Yes' : 'No'],
    ['Jobs Collected', s.jobsCollected],
    ['Duplicates Removed', s.duplicatesRemoved],
    ['Jobs After Role Filter', s.jobsAfterRoleFilter],
    ['Valid Jobs', s.jobsValid],
    ['Jobs Needing Review', s.jobsNeedingReview],
    ['Invalid Jobs', s.jobsInvalid],
    ['Execution Time (s)', Math.round(s.durationMs / 100) / 10],
  ];

  for (const [metric, value] of rows) {
    const row = sheet.addRow({ metric, value });
    row.getCell('metric').font = { bold: true };
  }

  styleHeaderRow(sheet);
}
