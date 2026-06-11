import Link from 'next/link';
import { aggregateReportsBySourceSystem, filterReports, issueCount, reviewedIssueCount } from '@/lib/evaluation/compare';
import { loadReports } from '@/lib/evaluation/report-store';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ topic?: string; sourceSystem?: string; lessonIndex?: string; targetLearner?: string }> };

const cellStyle = { border: '1px solid #ddd', padding: 8, textAlign: 'left' as const };

function FilterInput({ name, label, value }: { name: string; label: string; value?: string }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span>{label}</span>
      <input name={name} defaultValue={value || ''} style={{ padding: 6, minWidth: 180 }} />
    </label>
  );
}

export default async function EvalComparePage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const reports = filterReports(await loadReports(), filters);
  const aggregates = aggregateReportsBySourceSystem(reports);
  const aggregateHeaders = [
    'sourceSystem',
    'sampleCount',
    'avgEstimatedDurationMinutes',
    'avgScaffoldStabilityScore',
    'avgInteractionEffectivenessScore',
    'avgTeachingEfficiencyScore',
    'avgOverallScore',
    'scaffoldIssueCount',
    'interactionIssueCount',
    'efficiencyIssueCount',
    'reviewedIssueCount',
    'confirmedIssueCount',
    'rejectedIssueCount',
  ] as const;
  const detailHeaders = [
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
    'reviewedIssueCount',
    'confirmedIssueCount',
    'rejectedIssueCount',
    'createdAt',
    'detail',
  ];

  return (
    <main style={{ padding: 24, overflowX: 'auto' }}>
      <p><Link href="/eval/runs">← 返回报告列表</Link> · <Link href="/api/eval/reports/export" prefetch={false}>下载 CSV</Link></p>
      <h1>课程评测横向对比</h1>
      <form style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <FilterInput name="topic" label="topic" value={filters.topic} />
        <FilterInput name="sourceSystem" label="sourceSystem" value={filters.sourceSystem} />
        <FilterInput name="lessonIndex" label="lessonIndex" value={filters.lessonIndex} />
        <FilterInput name="targetLearner" label="targetLearner" value={filters.targetLearner} />
        <button type="submit" style={{ alignSelf: 'end', padding: '6px 12px' }}>过滤</button>
        <Link href="/eval/compare" style={{ alignSelf: 'end', padding: '6px 12px' }}>清空</Link>
      </form>

      <h2>按 sourceSystem 聚合</h2>
      <table style={{ borderCollapse: 'collapse', minWidth: 1300, marginBottom: 32 }}>
        <thead><tr>{aggregateHeaders.map((header) => <th key={header} style={cellStyle}>{header}</th>)}</tr></thead>
        <tbody>
          {aggregates.map((row) => (
            <tr key={row.sourceSystem}>{aggregateHeaders.map((header) => <td key={header} style={cellStyle}>{row[header]}</td>)}</tr>
          ))}
        </tbody>
      </table>

      <h2>报告明细</h2>
      <table style={{ borderCollapse: 'collapse', minWidth: 1700 }}>
        <thead><tr>{detailHeaders.map((header) => <th key={header} style={cellStyle}>{header}</th>)}</tr></thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.runId}>
              <td style={cellStyle}>{report.runId}</td>
              <td style={cellStyle}>{report.topic}</td>
              <td style={cellStyle}>{report.sourceSystem || 'unknown'}</td>
              <td style={cellStyle}>{report.targetLearner}</td>
              <td style={cellStyle}>{report.lessonIndex}</td>
              <td style={cellStyle}>{report.expectedDurationMinutes}</td>
              <td style={cellStyle}>{report.estimatedDurationMinutes}</td>
              <td style={cellStyle}>{report.scaffoldStabilityScore}</td>
              <td style={cellStyle}>{report.interactionEffectivenessScore}</td>
              <td style={cellStyle}>{report.teachingEfficiencyScore}</td>
              <td style={cellStyle}>{report.overallScore}</td>
              <td style={cellStyle}>{issueCount(report)}</td>
              <td style={cellStyle}>{reviewedIssueCount(report)}</td>
              <td style={cellStyle}>{reviewedIssueCount(report, true)}</td>
              <td style={cellStyle}>{reviewedIssueCount(report, false)}</td>
              <td style={cellStyle}>{report.createdAt}</td>
              <td style={cellStyle}><Link href={`/eval/runs/${report.runId}`}>detail</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
