import path from 'path';
import type { ReportData } from './reportTypes';
import { RECOMMENDATION_LABELS } from '../matcher/recommendation';
import { ensureDir, writeTextFile } from '../utils/fileSystem';
import { formatDateHuman } from '../utils/date';

const MARKDOWN_SUMMARY_FILENAME = 'execution-summary.md';

export function generateMarkdownSummary(data: ReportData, outputDir: string): string {
  ensureDir(outputDir);
  const filePath = path.join(outputDir, MARKDOWN_SUMMARY_FILENAME);

  const { summary, matches, resume, skillInsights } = data;
  const top5 = matches.slice(0, 5);

  const qaIssueCount = data.qaIssues.length;
  const needsReviewTitles = unique(
    data.qaIssues
      .filter((issue) => issue.status === 'needs_review')
      .map((issue) => issue.jobTitle || 'untitled')
  );

  const topGaps = countOccurrences(
    matches.flatMap((m) => (m.criticalGaps.length ? m.criticalGaps : m.missingSkills.slice(0, 3)))
  );
  const studySuggestions = countOccurrences(matches.flatMap((m) => m.studyPlan));

  const lines: string[] = [
    '# Execution Summary — AI Tech Job Matcher',
    '',
    `- **Executed at:** ${formatDateHuman(new Date(summary.executedAt))}`,
    `- **Resume format:** \`${summary.resumeFormat}\``,
    `- **Resume size:** ${summary.resumeCharacterCount} extracted characters`,
    `- **Selected role:** \`${summary.role}\``,
    `- **Job source:** \`${summary.source}\``,
    `- **Work mode filter:** \`${summary.workMode}\``,
    `- **Location preference:** ${summary.userLocation ? `\`${summary.userLocation}\`` : 'not provided'}`,
    `- **Jobs collected:** ${summary.jobsCollected}`,
    `- **Duplicates removed:** ${summary.duplicatesRemoved}`,
    `- **Jobs after role filter:** ${summary.jobsAfterRoleFilter}`,
    `- **Jobs after work mode filter:** ${summary.jobsAfterWorkModeFilter}`,
    `- **Valid jobs:** ${summary.jobsValid} (needs review: ${summary.jobsNeedingReview}, invalid: ${summary.jobsInvalid})`,
    `- **Analysis engine:** ${formatAnalysisEngine(summary)}`,
    '',
    '## Top 5 Job Matches',
    '',
    '| # | Score | Recommendation | Job | Company | Role |',
    '|---|-------|----------------|-----|---------|------|',
    ...top5.map((m, i) => {
      const jobLink = `[${escapeMarkdownTableCell(m.job.title)}](${escapeMarkdownUrl(m.job.url)})`;
      return `| ${i + 1} | ${m.score} | ${escapeMarkdownTableCell(RECOMMENDATION_LABELS[m.recommendation])} | ${jobLink} | ${escapeMarkdownTableCell(m.job.company)} | ${escapeMarkdownTableCell(m.analysis.role)} |`;
    }),
    '',
    '## Main Skills Found in the Market',
    '',
    ...skillInsights
      .slice(0, 10)
      .map(
        (s) => `- **${s.skill}** — ${s.mentions} mention(s), mostly in \`${s.relatedRole}\` roles`
      ),
    '',
    '## Candidate Main Gaps',
    '',
    ...(topGaps.length > 0
      ? topGaps.slice(0, 6).map(([gap, count]) => `- ${gap} (missing in ${count} job(s))`)
      : ['- No significant gaps detected against the analyzed jobs.']),
    '',
    '## Suggested Study Plan',
    '',
    ...(studySuggestions.length > 0
      ? studySuggestions.slice(0, 6).map(([topic], i) => `${i + 1}. ${topic}`)
      : ['1. Keep strengthening current skills — no urgent study topics detected.']),
    '',
    '## QA / Data Quality Notes',
    '',
    `- Total QA issues detected across jobs: **${qaIssueCount}**`,
    `- Jobs flagged as \`needs_review\`: **${needsReviewTitles.length}**` +
      (needsReviewTitles.length > 0 ? ` (${needsReviewTitles.slice(0, 3).join('; ')})` : ''),
    `- Candidate profile analysis mode: ${resume.fallbackMode ? 'fallback' : 'AI'}`,
    '- Full issue list available in the **QA Issues** sheet of `job-match-report.xlsx`.',
    '',
    '## Candidate Compatibility Notes',
    '',
    ...formatCandidateWarnings(matches),
    '',
    '---',
    '_Generated automatically by AI Tech Job Matcher._',
    '',
  ];

  writeTextFile(filePath, lines.join('\n'));
  return filePath;
}

function formatCandidateWarnings(matches: ReportData['matches']): string[] {
  const warnings = matches.flatMap((match) =>
    match.candidateWarnings.map(
      (warning) =>
        `- **${escapeMarkdownInline(match.job.title)}:** ${escapeMarkdownInline(warning.message)}`
    )
  );
  return warnings.length > 0
    ? warnings
    : ['- No candidate-specific compatibility warnings were detected.'];
}

function countOccurrences(items: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function formatAnalysisEngine(summary: ReportData['summary']): string {
  if (!summary.usedFallback) {
    return `Real AI (${summary.aiProvider})`;
  }
  if (summary.aiProvider === 'local-fallback') {
    return 'Local fallback (keyword-based, no API key needed)';
  }
  return `${summary.aiProvider} selected; local fallback used for failed or limited AI calls`;
}

function escapeMarkdownTableCell(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\]/g, '\\]')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function escapeMarkdownUrl(value: string): string {
  return value.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\s/g, '%20');
}

function escapeMarkdownInline(value: string): string {
  return value
    .replace(/([\\`*_{}[\]()<>#+.!|-])/g, '\\$1')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}
