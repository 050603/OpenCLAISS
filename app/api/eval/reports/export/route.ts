import { NextResponse } from 'next/server';
import { listCourseDiagnosticReports } from '@/lib/evaluation/report-storage';

const HEADERS = [
  'runId',
  'topic',
  'sourceSystem',
  'targetLearner',
  'lessonIndex',
  'expectedDurationMinutes',
  'estimatedDurationMinutes',
  'scaffoldStabilityScore',
  'interactionEffectivenessScore',
  'teachingEfficiencyScore',
  'overallScore',
  'issueCount',
  'scaffoldIssueCount',
  'interactionIssueCount',
  'efficiencyIssueCount',
  'createdAt',
];

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const reports = await listCourseDiagnosticReports();
  const rows = reports.map((report) => {
    const scaffoldIssueCount = report.issues.filter((issue) => issue.issueCategory === 'scaffold').length;
    const interactionIssueCount = report.issues.filter((issue) => issue.issueCategory === 'interaction').length;
    const efficiencyIssueCount = report.issues.filter((issue) => issue.issueCategory === 'efficiency').length;
    return [
      report.runId,
      report.topic,
      report.sourceSystem,
      report.targetLearner,
      report.lessonIndex,
      report.expectedDurationMinutes,
      report.estimatedDurationMinutes,
      report.scaffoldStabilityScore,
      report.interactionEffectivenessScore,
      report.teachingEfficiencyScore,
      report.overallScore,
      report.issues.length,
      scaffoldIssueCount,
      interactionIssueCount,
      efficiencyIssueCount,
      report.createdAt,
    ].map(csvEscape).join(',');
  });
  const csv = [HEADERS.join(','), ...rows].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="course-eval-reports.csv"',
    },
  });
}
