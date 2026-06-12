import Link from 'next/link';
import { listCourseDiagnosticReports } from '@/lib/evaluation/report-storage';
import type { CourseDiagnosticReport } from '@/lib/evaluation/schemas';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function matches(report: CourseDiagnosticReport, filters: { topic: string; sourceSystem: string; lessonIndex: string; targetLearner: string }): boolean {
  if (filters.topic && !report.topic.toLowerCase().includes(filters.topic.toLowerCase())) return false;
  if (filters.sourceSystem && report.sourceSystem !== filters.sourceSystem) return false;
  if (filters.lessonIndex && String(report.lessonIndex) !== filters.lessonIndex) return false;
  if (filters.targetLearner && report.targetLearner !== filters.targetLearner) return false;
  return true;
}

function issueStats(report: CourseDiagnosticReport) {
  return {
    highScaffold: report.issues.filter((issue) => issue.issueCategory === 'scaffold' && issue.severity === 'high').length,
    weakGamification: report.issues.filter((issue) => issue.issueCategory === 'interaction' && issue.issueType === 'weak_gamification').length,
    efficiency: report.issues.filter((issue) => issue.issueCategory === 'efficiency').length,
    reviewed: report.issues.filter((issue) => issue.humanReview?.reviewedAt).length,
    confirmed: report.issues.filter((issue) => issue.humanReview?.confirmed === true).length,
    rejected: report.issues.filter((issue) => issue.humanReview?.confirmed === false).length,
  };
}

export default async function EvalComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    topic: first(params.topic),
    sourceSystem: first(params.sourceSystem),
    lessonIndex: first(params.lessonIndex),
    targetLearner: first(params.targetLearner),
  };
  const allReports = await listCourseDiagnosticReports();
  const reports = allReports.filter((report) => matches(report, filters));
  const sourceSystems = [...new Set(allReports.map((report) => report.sourceSystem))].sort();
  const lessonIndexes = [...new Set(allReports.map((report) => String(report.lessonIndex)))].sort();
  const targetLearners = [...new Set(allReports.map((report) => report.targetLearner))].sort();
  const groups = [...new Set(reports.map((report) => report.sourceSystem))].map((sourceSystem) => {
    const items = reports.filter((report) => report.sourceSystem === sourceSystem);
    const stats = items.map(issueStats);
    return {
      sourceSystem,
      count: items.length,
      estimatedDurationMinutes: avg(items.map((item) => item.estimatedDurationMinutes)),
      scaffoldStabilityScore: avg(items.map((item) => item.scaffoldStabilityScore)),
      interactionEffectivenessScore: avg(items.map((item) => item.interactionEffectivenessScore)),
      teachingEfficiencyScore: avg(items.map((item) => item.teachingEfficiencyScore)),
      overallScore: avg(items.map((item) => item.overallScore)),
      highScaffold: stats.reduce((sum, item) => sum + item.highScaffold, 0),
      weakGamification: stats.reduce((sum, item) => sum + item.weakGamification, 0),
      efficiency: stats.reduce((sum, item) => sum + item.efficiency, 0),
      reviewed: stats.reduce((sum, item) => sum + item.reviewed, 0),
      confirmed: stats.reduce((sum, item) => sum + item.confirmed, 0),
      rejected: stats.reduce((sum, item) => sum + item.rejected, 0),
    };
  });

  const cell = { border: '1px solid #ddd', padding: 8 };
  return (
    <main style={{ padding: 24, overflowX: 'auto' }}>
      <p><Link href="/eval/runs">← 返回报告列表</Link></p>
      <h1>课程诊断横向对比</h1>
      <p>该页面用于比较不同来源系统或不同版本 OpenMAIC 在同一课程主题下的诊断指标。</p>
      <p><Link href="/api/eval/reports/export">导出全部 reports CSV</Link></p>
      <form style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '16px 0' }}>
        <label>topic 关键词 <input name="topic" defaultValue={filters.topic} /></label>
        <label>sourceSystem <select name="sourceSystem" defaultValue={filters.sourceSystem}><option value="">全部</option>{sourceSystems.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>lessonIndex <select name="lessonIndex" defaultValue={filters.lessonIndex}><option value="">全部</option>{lessonIndexes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>targetLearner <select name="targetLearner" defaultValue={filters.targetLearner}><option value="">全部</option>{targetLearners.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="submit">过滤</button>
      </form>

      <h2>总览表</h2>
      <table style={{ borderCollapse: 'collapse', minWidth: 1200 }}>
        <thead><tr>{['sourceSystem','样本数','平均 estimatedDurationMinutes','平均 scaffoldStabilityScore','平均 interactionEffectivenessScore','平均 teachingEfficiencyScore','平均 overallScore','high scaffold issue 数','weak gamification issue 数','efficiency issue 数','reviewed issue count','confirmed issue count','rejected issue count'].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{groups.map((group) => <tr key={group.sourceSystem}><td style={cell}>{group.sourceSystem}</td><td style={cell}>{group.count}</td><td style={cell}>{group.estimatedDurationMinutes}</td><td style={cell}>{group.scaffoldStabilityScore}</td><td style={cell}>{group.interactionEffectivenessScore}</td><td style={cell}>{group.teachingEfficiencyScore}</td><td style={cell}>{group.overallScore}</td><td style={cell}>{group.highScaffold}</td><td style={cell}>{group.weakGamification}</td><td style={cell}>{group.efficiency}</td><td style={cell}>{group.reviewed}</td><td style={cell}>{group.confirmed}</td><td style={cell}>{group.rejected}</td></tr>)}</tbody>
      </table>

      <h2>明细表</h2>
      <table style={{ borderCollapse: 'collapse', minWidth: 1400 }}>
        <thead><tr>{['runId','topic','sourceSystem','targetLearner','lessonIndex','expectedDurationMinutes','estimatedDurationMinutes','scaffoldStabilityScore','interactionEffectivenessScore','teachingEfficiencyScore','overallScore','issue count','createdAt','detail link'].map((h) => <th key={h} style={cell}>{h}</th>)}</tr></thead>
        <tbody>{reports.map((report) => <tr key={report.runId}><td style={cell}>{report.runId}</td><td style={cell}>{report.topic}</td><td style={cell}>{report.sourceSystem}</td><td style={cell}>{report.targetLearner}</td><td style={cell}>{report.lessonIndex}</td><td style={cell}>{report.expectedDurationMinutes}</td><td style={cell}>{report.estimatedDurationMinutes}</td><td style={cell}>{report.scaffoldStabilityScore}</td><td style={cell}>{report.interactionEffectivenessScore}</td><td style={cell}>{report.teachingEfficiencyScore}</td><td style={cell}>{report.overallScore}</td><td style={cell}>{report.issues.length}</td><td style={cell}>{report.createdAt}</td><td style={cell}><Link href={`/eval/runs/${report.runId}`}>detail</Link></td></tr>)}</tbody>
      </table>
    </main>
  );
}
