import path from 'path';
import ExcelJS from 'exceljs';
import { expect, test } from '@playwright/test';
import { runPipeline } from '../../src/index';
import type { CliOptions } from '../../src/cli/cliTypes';

const RESUME_PATH = path.resolve(__dirname, '../../samples/sample-resume.txt');
const OUTPUT_DIR = path.resolve(__dirname, '../../output/e2e/excel');

const options: CliOptions = {
  resume: RESUME_PATH,
  role: 'all',
  source: 'sample',
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
    expect(Number(rows.get('Jobs Collected'))).toBeGreaterThanOrEqual(16);
  });
});
