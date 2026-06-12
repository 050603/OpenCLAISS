import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CourseDiagnosticReport } from '@/lib/evaluation/schemas';
import { readCourseDiagnosticReport } from '@/lib/evaluation/report-storage';
import { HumanReviewForm } from './HumanReviewForm';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ runId: string }> };

async function loadReport(runId: string): Promise<CourseDiagnosticReport | null> {
  return readCourseDiagnosticReport(runId);
}

const cardStyle = { border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 };

export default async function EvalRunDetailPage({ params }: PageProps) {
  const { runId } = await params;
  const report = await loadReport(runId);
  if (!report) notFound();
  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <p><Link href="/eval/runs">← 返回报告列表</Link></p>
      <h1>{report.topic}</h1>
      <p>runId: {report.runId}</p>
      <p>来源: {report.sourceSystem} / 学习者: {report.targetLearner} / 第 {report.lessonIndex} 课 / 目标 {report.expectedDurationMinutes} 分钟 / 估算 {report.estimatedDurationMinutes} 分钟</p>
      <p><a href={`/api/eval/reports/${report.runId}`} download>下载 JSON 报告</a></p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <div style={cardStyle}>脚手架稳定性<br /><strong>{report.scaffoldStabilityScore}</strong></div>
        <div style={cardStyle}>互动有效性<br /><strong>{report.interactionEffectivenessScore}</strong></div>
        <div style={cardStyle}>授课效率<br /><strong>{report.teachingEfficiencyScore}</strong></div>
        <div style={cardStyle}>综合得分<br /><strong>{report.overallScore}</strong></div>
      </section>
      <section style={cardStyle}>
        <h2>Summary</h2>
        <p>{report.summary || '暂无摘要。'}</p>
      </section>
      <section style={cardStyle}>
        <h2>Issues</h2>
        {report.issues.length === 0 ? <p>未发现主要问题。</p> : report.issues.map((issue) => (
          <article key={issue.id} style={cardStyle}>
            <h3>{issue.severity} / {issue.issueCategory} / {issue.issueType} / {issue.sceneId}</h3>
            <p><strong>证据：</strong>{issue.evidence || '该项评估失败或无证据。'}</p>
            <p><strong>原因：</strong>{issue.reason || '该项评估失败。'}</p>
            <p><strong>建议：</strong>{issue.suggestion || '暂无建议。'}</p>
            <p><strong>人工确认：</strong>{issue.humanReview?.confirmed === true ? '已确认有效' : issue.humanReview?.confirmed === false ? '已确认无效' : '未确认'}</p>
            {issue.humanReview?.reviewer ? <p><strong>reviewer：</strong>{issue.humanReview.reviewer}</p> : null}
            {issue.humanReview?.note ? <p><strong>note：</strong>{issue.humanReview.note}</p> : null}
            {issue.humanReview?.reviewedAt ? <p><strong>reviewedAt：</strong>{issue.humanReview.reviewedAt}</p> : null}
            <HumanReviewForm runId={report.runId} issueId={issue.id} defaultReviewer={issue.humanReview?.reviewer} defaultNote={issue.humanReview?.note} defaultConfirmed={issue.humanReview?.confirmed} />
          </article>
        ))}
      </section>
      <section>
        <h2>Scenes</h2>
        {report.scenes.map((scene) => {
          const concepts = report.concepts.filter((concept) => concept.sceneId === scene.sceneId);
          const scaffold = report.scaffoldIssues.find((item) => item.sceneId === scene.sceneId);
          const interaction = report.interactionEvaluations.find((item) => item.sceneId === scene.sceneId);
          const efficiency = report.efficiencyEvaluations.find((item) => item.sceneId === scene.sceneId);
          return (
            <article key={scene.sceneId} style={cardStyle}>
              <h3>{scene.sceneIndex + 1}. {scene.sceneType} / {scene.speaker || 'unknown'} / {scene.estimatedTimeSeconds}s</h3>
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 12 }}>{scene.content}</pre>
              <p><strong>概念：</strong>{concepts.length ? concepts.map((concept) => `${concept.concept}(${concept.difficulty})`).join('、') : '未检测到'}</p>
              <p><strong>脚手架：</strong>{scaffold ? `${scaffold.hasIssue ? '有风险' : '正常'} / ${scaffold.reason || '该项评估失败'}` : '该项评估失败'}</p>
              <p><strong>互动：</strong>{interaction ? `${interaction.hasWeakGamification ? '弱游戏化风险' : '正常'} / ${interaction.reason || '该项评估失败'}` : '该项评估失败'}</p>
              <p><strong>效率：</strong>{efficiency ? `${efficiency.hasEfficiencyProblem ? '低效风险' : '正常'} / ${efficiency.reason || '该项评估失败'}` : '该项评估失败'}</p>
              <p><strong>建议：</strong>{[scaffold?.suggestion, interaction?.suggestion, efficiency?.suggestion].filter(Boolean).join('；') || '暂无建议'}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
