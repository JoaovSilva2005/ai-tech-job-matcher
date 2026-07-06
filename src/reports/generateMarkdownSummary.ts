import path from 'path';
import type { ReportData } from './reportTypes';
import { RECOMMENDATION_LABELS } from '../matcher/recommendation';
import { ensureDir, writeTextFile } from '../utils/fileSystem';
import { formatDateHuman } from '../utils/date';

export const MARKDOWN_SUMMARY_FILENAME = 'execution-summary.md';

export function generateMarkdownSummary(data: ReportData, outputDir: string): string {
  ensureDir(outputDir);
  const filePath = path.join(outputDir, MARKDOWN_SUMMARY_FILENAME);

  const { summary, matches, resume, skillInsights } = data;
  const top5 = matches.slice(0, 5);

  const qaIssueCount = data.qaIssues.length;
  const needsReviewTitles = unique(
    data.qaIssues.filter((issue) => issue.status === 'needs_review').map((issue) => issue.jobTitle || 'untitled')
  );

  const topGaps = countOccurrences(matches.flatMap((m) => m.criticalGaps.length ? m.criticalGaps : m.missingSkills.slice(0, 3)));
  const studySuggestions = countOccurrences(matches.flatMap((m) => m.studyPlan));

  const lines: string[] = [
    '# Execution Summary — AI Tech Job Matcher',
    '',
    `- **Executed at:** ${formatDateHuman(new Date(summary.executedAt))}`,
    `- **Resume file:** \`${path.basename(summary.resumeFile)}\``,
    `- **Selected role:** \`${summary.role}\``,
    `- **Job source:** \`${summary.source}\``,
    `- **Jobs collected:** ${summary.jobsCollected}`,
    `- **Duplicates removed:** ${summary.duplicatesRemoved}`,
    `- **Jobs after role filter:** ${summary.jobsAfterRoleFilter}`,
    `- **Valid jobs:** ${summary.jobsValid} (needs review: ${summary.jobsNeedingReview}, invalid: ${summary.jobsInvalid})`,
    `- **Analysis engine:** ${summary.usedFallback ? '🔁 Local fallback (keyword-based, no API key needed)' : `🤖 Real AI (${summary.aiProvider})`}`,
    '',
    '## Top 5 Job Matches',
    '',
    '| # | Score | Recommendation | Job | Company | Role |',
    '|---|-------|----------------|-----|---------|------|',
    ...top5.map(
      (m, i) =>
        `| ${i + 1} | ${m.score} | ${RECOMMENDATION_LABELS[m.recommendation]} | ${m.job.title} | ${m.job.company} | ${m.analysis.role} |`
    ),
    '',
    '## Main Skills Found in the Market',
    '',
    ...skillInsights
      .slice(0, 10)
      .map((s) => `- **${s.skill}** — ${s.mentions} mention(s), mostly in \`${s.relatedRole}\` roles`),
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
      (needsReviewTitles.length > 0
        ? ` (${needsReviewTitles.slice(0, 3).join('; ')})`
        : ''),
    `- Candidate profile analysis mode: ${resume.fallbackMode ? 'fallback' : 'AI'}`,
    '- Full issue list available in the **QA Issues** sheet of `job-match-report.xlsx`.',
    '',
    '---',
    '_Generated automatically by AI Tech Job Matcher._',
    '',
  ];

  writeTextFile(filePath, lines.join('\n'));
  return filePath;
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
