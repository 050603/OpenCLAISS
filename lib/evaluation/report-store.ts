import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { CourseDiagnosticReportSchema, type CourseDiagnosticReport, type DiagnosticIssue } from '@/lib/evaluation/schemas';

const VALID_RUN_ID_RE = /^[a-zA-Z0-9._-]+$/;

export function assertValidRunId(runId: string): void {
  if (!VALID_RUN_ID_RE.test(runId)) throw new Error('Invalid runId');
}

function reportDir(): string {
  return process.env.EVAL_REPORT_DIR || 'data/eval/reports';
}

function reportPath(runId: string): string {
  assertValidRunId(runId);
  return path.join(process.cwd(), reportDir(), `${runId}.json`);
}

export function normalizeReport(raw: unknown): CourseDiagnosticReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = { sourceSystem: 'unknown', ...(raw as Record<string, unknown>) };
  const parsed = CourseDiagnosticReportSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export async function loadReports(): Promise<CourseDiagnosticReport[]> {
  const dir = path.join(process.cwd(), reportDir());
  try {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));
    const reports = await Promise.all(
      files.map(async (file) => {
        try {
          return normalizeReport(JSON.parse(await readFile(path.join(dir, file), 'utf8')));
        } catch {
          return null;
        }
      }),
    );
    return reports
      .filter((report): report is CourseDiagnosticReport => report !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function loadReport(runId: string): Promise<CourseDiagnosticReport | null> {
  try {
    const raw = JSON.parse(await readFile(reportPath(runId), 'utf8'));
    return normalizeReport(raw);
  } catch {
    return null;
  }
}

export async function saveReportToStore(report: CourseDiagnosticReport): Promise<string> {
  const normalized = normalizeReport(report);
  if (!normalized) throw new Error('Invalid report');
  const filePath = reportPath(normalized.runId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf8');
  return filePath;
}

export async function updateIssueHumanReview(params: {
  runId: string;
  issueId: string;
  review: {
    confirmed: boolean;
    reviewer?: string;
    note?: string;
  };
}): Promise<DiagnosticIssue | null> {
  assertValidRunId(params.runId);
  if (!params.issueId.trim()) throw new Error('Invalid issueId');
  const report = await loadReport(params.runId);
  if (!report) return null;
  const issue = report.issues.find((item) => item.id === params.issueId);
  if (!issue) return null;
  issue.humanReview = {
    confirmed: params.review.confirmed,
    reviewer: params.review.reviewer?.trim() || undefined,
    note: params.review.note?.trim() || undefined,
    reviewedAt: new Date().toISOString(),
  };
  await saveReportToStore(report);
  return issue;
}

function countIssues(report: CourseDiagnosticReport, category?: DiagnosticIssue['issueCategory']): number {
  return report.issues.filter((issue) => !category || issue.issueCategory === category).length;
}

function countReviewed(report: CourseDiagnosticReport, confirmed?: boolean): number {
  return report.issues.filter((issue) => {
    if (issue.humanReview?.confirmed === undefined) return false;
    return confirmed === undefined || issue.humanReview.confirmed === confirmed;
  }).length;
}

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function reportToCsvRows(reports: CourseDiagnosticReport[]): string {
  const headers = [
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
    'reviewedIssueCount',
    'confirmedIssueCount',
    'rejectedIssueCount',
    'createdAt',
  ];
  const rows = reports.map((report) => [
    report.runId,
    report.topic,
    report.sourceSystem || 'unknown',
    report.targetLearner,
    report.lessonIndex,
    report.expectedDurationMinutes,
    report.estimatedDurationMinutes,
    report.scaffoldStabilityScore,
    report.interactionEffectivenessScore,
    report.teachingEfficiencyScore,
    report.overallScore,
    report.issues.length,
    countIssues(report, 'scaffold'),
    countIssues(report, 'interaction'),
    countIssues(report, 'efficiency'),
    countReviewed(report),
    countReviewed(report, true),
    countReviewed(report, false),
    report.createdAt,
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}
