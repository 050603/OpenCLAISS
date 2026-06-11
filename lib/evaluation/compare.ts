import type { CourseDiagnosticReport, DiagnosticIssue } from '@/lib/evaluation/schemas';

export interface EvaluationReportFilters {
  topic?: string;
  sourceSystem?: string;
  lessonIndex?: string | number;
  targetLearner?: string;
}

export interface SourceSystemAggregate {
  sourceSystem: string;
  sampleCount: number;
  avgEstimatedDurationMinutes: number;
  avgScaffoldStabilityScore: number;
  avgInteractionEffectivenessScore: number;
  avgTeachingEfficiencyScore: number;
  avgOverallScore: number;
  scaffoldIssueCount: number;
  interactionIssueCount: number;
  efficiencyIssueCount: number;
  reviewedIssueCount: number;
  confirmedIssueCount: number;
  rejectedIssueCount: number;
}

function includesIgnoreCase(value: string, query?: string): boolean {
  return !query || value.toLowerCase().includes(query.toLowerCase());
}

export function filterReports(reports: CourseDiagnosticReport[], filters: EvaluationReportFilters): CourseDiagnosticReport[] {
  const lessonIndex = filters.lessonIndex == null || filters.lessonIndex === '' ? undefined : Number(filters.lessonIndex);
  return reports.filter((report) => {
    if (!includesIgnoreCase(report.topic, filters.topic)) return false;
    if (!includesIgnoreCase(report.sourceSystem || 'unknown', filters.sourceSystem)) return false;
    if (!includesIgnoreCase(report.targetLearner, filters.targetLearner)) return false;
    if (lessonIndex !== undefined && report.lessonIndex !== lessonIndex) return false;
    return true;
  });
}

export function issueCount(report: CourseDiagnosticReport, category?: DiagnosticIssue['issueCategory']): number {
  return report.issues.filter((issue) => !category || issue.issueCategory === category).length;
}

export function reviewedIssueCount(report: CourseDiagnosticReport, confirmed?: boolean): number {
  return report.issues.filter((issue) => {
    if (issue.humanReview?.confirmed === undefined) return false;
    return confirmed === undefined || issue.humanReview.confirmed === confirmed;
  }).length;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function avg(reports: CourseDiagnosticReport[], getValue: (report: CourseDiagnosticReport) => number): number {
  if (reports.length === 0) return 0;
  return round(reports.reduce((sum, report) => sum + getValue(report), 0) / reports.length);
}

export function aggregateReportsBySourceSystem(reports: CourseDiagnosticReport[]): SourceSystemAggregate[] {
  const groups = new Map<string, CourseDiagnosticReport[]>();
  for (const report of reports) {
    const sourceSystem = report.sourceSystem || 'unknown';
    groups.set(sourceSystem, [...(groups.get(sourceSystem) || []), report]);
  }
  return [...groups.entries()].map(([sourceSystem, group]) => ({
    sourceSystem,
    sampleCount: group.length,
    avgEstimatedDurationMinutes: avg(group, (report) => report.estimatedDurationMinutes),
    avgScaffoldStabilityScore: avg(group, (report) => report.scaffoldStabilityScore),
    avgInteractionEffectivenessScore: avg(group, (report) => report.interactionEffectivenessScore),
    avgTeachingEfficiencyScore: avg(group, (report) => report.teachingEfficiencyScore),
    avgOverallScore: avg(group, (report) => report.overallScore),
    scaffoldIssueCount: group.reduce((sum, report) => sum + issueCount(report, 'scaffold'), 0),
    interactionIssueCount: group.reduce((sum, report) => sum + issueCount(report, 'interaction'), 0),
    efficiencyIssueCount: group.reduce((sum, report) => sum + issueCount(report, 'efficiency'), 0),
    reviewedIssueCount: group.reduce((sum, report) => sum + reviewedIssueCount(report), 0),
    confirmedIssueCount: group.reduce((sum, report) => sum + reviewedIssueCount(report, true), 0),
    rejectedIssueCount: group.reduce((sum, report) => sum + reviewedIssueCount(report, false), 0),
  })).sort((a, b) => a.sourceSystem.localeCompare(b.sourceSystem));
}
