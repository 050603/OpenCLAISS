import { readdir, readFile } from 'fs/promises';
import Link from 'next/link';
import { existsSync } from 'fs';
import path from 'path';
import { CourseDiagnosticReportSchema, type CourseDiagnosticReport } from '@/lib/evaluation/schemas';

export const dynamic = 'force-dynamic';

async function loadReports(): Promise<CourseDiagnosticReport[]> {
  const dir = path.join(process.cwd(), process.env.EVAL_REPORT_DIR || 'data/eval/reports');
  try {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));
    const reports = await Promise.all(
      files.map(async (file) => CourseDiagnosticReportSchema.safeParse(JSON.parse(await readFile(path.join(dir, file), 'utf8')))),
    );
    return reports.filter((result) => result.success).map((result) => result.data).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export default async function EvalRunsPage() {
  const reports = await loadReports();
  const repoRoot = process.cwd();
  const hasPackageJson = existsSync(path.join(repoRoot, 'package.json'));
  return (
    <main style={{ padding: 24, overflowX: 'auto' }}>
      <h1>课程生成质量诊断报告</h1>
      <p>读取本地 EVAL_REPORT_DIR 下的 JSON 报告，用于研究评测和 baseline 对比。</p>
      {reports.length === 0 ? (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fafafa' }}>
          <p>暂无报告。请先在项目根目录生成 report，然后刷新本页。</p>
          <p>当前服务端工作目录：<code>{repoRoot}</code>{hasPackageJson ? '' : '（未检测到 package.json，请检查启动目录）'}</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#111827', color: '#f9fafb', padding: 12, borderRadius: 6 }}>
{`pwd
test -f package.json || echo "请先 cd 到包含 package.json 的 OpenMAIC 仓库根目录"
EVAL_USE_MOCK_LLM=true npm run eval:course -- --input examples/eval/sample-course.txt --topic "人工智能的三大基石" --targetLearner "大学一年级非计算机专业学生" --lessonIndex 1 --expectedDurationMinutes 10 --sourceSystem "OpenMAIC"`}
          </pre>
          <p>如果你看到 npm ENOENT / Could not read package.json，说明命令是在错误目录运行的，而不是诊断模块本身报错。</p>
        </div>
        <p>暂无报告。请先运行 npm run eval:course 生成 report。</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', minWidth: 1200 }}>
          <thead>
            <tr>
              {['runId', 'topic', 'targetLearner', 'lessonIndex', 'expectedDurationMinutes', 'estimatedDurationMinutes', 'scaffoldStabilityScore', 'interactionEffectivenessScore', 'teachingEfficiencyScore', 'overallScore', 'createdAt'].map((header) => (
                <th key={header} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.runId}>
                <td style={{ border: '1px solid #ddd', padding: 8 }}><Link href={`/eval/runs/${report.runId}`}>{report.runId}</Link></td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.topic}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.targetLearner}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.lessonIndex}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.expectedDurationMinutes}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.estimatedDurationMinutes}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.scaffoldStabilityScore}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.interactionEffectivenessScore}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.teachingEfficiencyScore}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.overallScore}</td>
                <td style={{ border: '1px solid #ddd', padding: 8 }}>{report.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
