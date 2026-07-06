import type ExcelJS from 'exceljs';
import type { Recommendation } from '../matcher/recommendation';

export const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF2F4F6F' },
};

export const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

/** Soft pastel fills so a recruiter can scan the ranking at a glance. */
export const RECOMMENDATION_FILLS: Record<Recommendation, string> = {
  strong_apply: 'FFC6EFCE', // soft green
  apply: 'FFE2EFDA', // lighter green
  study_before_applying: 'FFFFF2CC', // soft yellow
  low_priority: 'FFFCE4D6', // soft orange
  not_recommended: 'FFF8CBAD', // stronger orange
};

export const SEVERITY_FILLS: Record<'low' | 'medium' | 'high', string> = {
  low: 'FFFFF2CC',
  medium: 'FFFCE4D6',
  high: 'FFF8CBAD',
};

export function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

export function applyAutoFilter(sheet: ExcelJS.Worksheet, lastColumn: string): void {
  sheet.autoFilter = { from: 'A1', to: `${lastColumn}1` };
}

export function fillCell(cell: ExcelJS.Cell, argb: string): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}
