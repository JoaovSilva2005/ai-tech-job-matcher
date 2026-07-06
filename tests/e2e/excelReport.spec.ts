import path from 'path';
import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';
import { runPipeline } from '../../src/index';
import type { CliOptions } from '../../src/cli/cliTypes';
import { generateExcelReport } from '../../src/reports/generateExcelReport';
import type { ReportData } from '../../src/reports/reportTypes';

const RESUME_PATH = path.resolve(__dirname, '../../samples/sample-resume.txt');
const OUTPUT_DIR = path.resolve(__dirname, '../../output/e2e/excel');

const options: CliOptions = {
  resume: RESUME_PATH,
  role: 'all',
  source: 'sample',
  workMode: 'all',
  userLocation: '',
  limit: 20,
  output: OUTPUT_DIR,
  fallback: true,
  debug: false,
};

test.describe('Excel report generation', () => {
  test('generates a workbook with the six required sheets and a sorted ranking', async () => {
    const result = await runPipeline(options);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(result.outputFiles.excel);

    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toEqual([
      'Ranking',
      'Details',
      'QA Issues',
      'Resume Analysis',
      'Market Insights',
      'Execution Summary',
    ]);

    const ranking = workbook.getWorksheet('Ranking')!;
    // header + one row per match
    expect(ranking.rowCount).toBe(result.matches.length + 1);

    // header formatting: frozen first row + autofilter
    expect(ranking.views?.[0]?.state).toBe('frozen');
    expect(ranking.autoFilter).toBeTruthy();

    // scores sorted in descending order
    const scores: number[] = [];
    ranking.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      scores.push(Number(row.getCell(2).value));
    });
    expect(scores).toEqual([...scores].sort((a, b) => b - a));

    // every score within 0..100
    for (const score of scores) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  test('resume analysis sheet exposes skills but not personal contact data', async () => {
    const result = await runPipeline({ ...options, output: path.join(OUTPUT_DIR, 'privacy') });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(result.outputFiles.excel);

    const sheet = workbook.getWorksheet('Resume Analysis')!;
    let allText = '';
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        allText += `${cell.value ?? ''} `;
      });
    });

    expect(allText).toContain('JavaScript');
    // sanitized: the sample resume email/phone must never reach the report
    expect(allText).not.toContain('alex.santos.demo@example.com');
    expect(allText).not.toContain('91234-5678');
  });

  test('execution summary sheet records fallback mode', async () => {
    const result = await runPipeline({ ...options, output: path.join(OUTPUT_DIR, 'summary') });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(result.outputFiles.excel);

    const sheet = workbook.getWorksheet('Execution Summary')!;
    const rows = new Map<string, string>();
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.set(String(row.getCell(1).value), String(row.getCell(2).value));
    });

    expect(rows.get('Used Fallback Mode')).toBe('Yes');
    expect(rows.get('Job Source')).toBe('sample');
    expect(rows.get('Work Mode Filter')).toBe('all');
    expect(Number(rows.get('Jobs Collected'))).toBeGreaterThanOrEqual(16);
  });

  test('QA Issues sheet includes invalid jobs excluded from ranking', async () => {
    const outputDir = path.join(OUTPUT_DIR, 'invalid-qa-issue');
    const reportData: ReportData = {
      matches: [],
      resume: {
        detectedSeniority: 'intern',
        targetRoles: ['qa'],
        technicalSkills: ['JavaScript'],
        qaSkills: ['Manual Testing'],
        developmentSkills: [],
        dataSkills: [],
        devopsSkills: [],
        supportSkills: [],
        tools: ['Git'],
        languages: [{ language: 'English', level: 'intermediate' }],
        strengths: ['Careful validation'],
        improvementAreas: ['Automation'],
        summary: 'Test profile',
        fallbackMode: true,
      },
      summary: {
        executedAt: new Date('2026-07-01T12:00:00.000Z').toISOString(),
        resumeFile: RESUME_PATH,
        role: 'qa',
        source: 'sample',
        workMode: 'all',
        userLocation: undefined,
        aiProvider: 'local-fallback',
        usedFallback: true,
        jobsCollected: 1,
        jobsValid: 0,
        jobsNeedingReview: 0,
        jobsInvalid: 1,
        duplicatesRemoved: 0,
        jobsAfterRoleFilter: 0,
        jobsAfterWorkModeFilter: 0,
        durationMs: 100,
      },
      skillInsights: [],
      qaIssues: [
        {
          jobId: 'invalid-1',
          jobTitle: '',
          company: 'Ghost Corp',
          field: 'title',
          severity: 'high',
          message: 'Job title is empty',
          dataQualityScore: 70,
          status: 'invalid',
          includedInRanking: false,
        },
      ],
    };

    const excelPath = await generateExcelReport(reportData, outputDir);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet('QA Issues')!;
    expect(sheet.getRow(1).values).toContain('Included In Ranking');
    expect(sheet.getCell('A2').value).toBe('(empty title)');
    expect(sheet.getCell('B2').value).toBe('Ghost Corp');
    expect(sheet.getCell('D2').value).toBe('high');
    expect(sheet.getCell('G2').value).toBe('invalid');
    expect(sheet.getCell('H2').value).toBe('No');
  });
});
