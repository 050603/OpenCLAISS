import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { CourseDiagnosticReportSchema, type CourseDiagnosticReport, type CourseGenerationInput, type DiagnosticIssue, type EfficiencyEvaluation, type ExtractedConcept, type InteractionEvaluation, type ParsedScene, type ScaffoldIssue } from '@/lib/evaluation/schemas';

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

function severityFromRating(rating: number): DiagnosticIssue['severity'] {
  if (rating >= 4) return 'high';
  if (rating >= 3) return 'medium';
  return 'low';
}

function issueDeduction(severity: DiagnosticIssue['severity'], high = 15, medium = 8, low = 3): number {
  return severity === 'high' ? high : severity === 'medium' ? medium : low;
}

function reportDir(): string {
  return process.env.EVAL_REPORT_DIR || 'data/eval/reports';
}

export async function saveReport(report: CourseDiagnosticReport): Promise<string> {
  const filePath = path.join(process.cwd(), reportDir(), `${report.runId}.json`);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(report, null, 2));
  return filePath;
}

export async function generateReport(params: {
  input: CourseGenerationInput;
  scenes: ParsedScene[];
  concepts: ExtractedConcept[];
  scaffoldIssues: ScaffoldIssue[];
  interactionEvaluations: InteractionEvaluation[];
  efficiencyEvaluations: EfficiencyEvaluation[];
}): Promise<CourseDiagnosticReport> {
  const { input, scenes, concepts, scaffoldIssues, interactionEvaluations, efficiencyEvaluations } = params;
  const estimatedDurationMinutes = Math.round((scenes.reduce((sum, scene) => sum + scene.estimatedTimeSeconds, 0) / 60) * 10) / 10;
  const issues: DiagnosticIssue[] = [];

  for (const item of scaffoldIssues.filter((issue) => issue.hasIssue)) {
    issues.push({
      id: `${input.runId}-${item.sceneId}-scaffold`,
      sceneId: item.sceneId,
      issueCategory: 'scaffold',
      issueType: item.issueType,
      severity: severityFromRating(item.severity),
      evidence: item.evidence,
      reason: item.reason,
      suggestion: item.suggestion,
    });
  }
  for (const item of interactionEvaluations.filter((evaluation) => evaluation.hasWeakGamification)) {
    const avg = (item.learningGoalAlignment + item.knowledgeActionCoupling + (6 - item.extraneousCognitiveLoad) + item.necessity + item.timeValue) / 5;
    issues.push({
      id: `${input.runId}-${item.sceneId}-interaction`,
      sceneId: item.sceneId,
      issueCategory: 'interaction',
      issueType: 'weak_gamification',
      severity: avg < 2.5 ? 'high' : 'medium',
      evidence: item.reason,
      reason: item.reason,
      suggestion: item.suggestion,
    });
  }
  for (const item of efficiencyEvaluations.filter((evaluation) => evaluation.hasEfficiencyProblem)) {
    issues.push({
      id: `${input.runId}-${item.sceneId}-efficiency`,
      sceneId: item.sceneId,
      issueCategory: 'efficiency',
      issueType: 'low_teaching_efficiency',
      severity: item.efficiencyScore < 50 ? 'high' : item.efficiencyScore < 70 ? 'medium' : 'low',
      evidence: [...item.fillerPhrases, ...item.lowValueAgentTurns].join('；'),
      reason: item.reason,
      suggestion: item.suggestion,
    });
  }

  let scaffoldScore = 100;
  for (const issue of issues.filter((item) => item.issueCategory === 'scaffold')) scaffoldScore -= issueDeduction(issue.severity);

  let interactionScore = 100;
  for (const evaluation of interactionEvaluations) {
    if (evaluation.hasWeakGamification) interactionScore -= 12;
    const avg = (evaluation.learningGoalAlignment + evaluation.knowledgeActionCoupling + (6 - evaluation.extraneousCognitiveLoad) + evaluation.necessity + evaluation.timeValue) / 5;
    if (evaluation.isInteraction && avg < 3) interactionScore -= 8;
  }

  let efficiencyScore = 100;
  if (estimatedDurationMinutes > input.expectedDurationMinutes * 1.3) efficiencyScore -= 20;
  for (const evaluation of efficiencyEvaluations.filter((item) => item.hasEfficiencyProblem)) {
    efficiencyScore -= evaluation.efficiencyScore < 50 ? 12 : evaluation.efficiencyScore < 70 ? 8 : 5;
    efficiencyScore -= Math.floor(evaluation.redundantUtteranceRatio * 10) * 5;
  }

  const scaffoldStabilityScore = clampScore(scaffoldScore);
  const interactionEffectivenessScore = clampScore(interactionScore);
  const teachingEfficiencyScore = clampScore(efficiencyScore);
  const overallScore = clampScore(scaffoldStabilityScore * 0.4 + interactionEffectivenessScore * 0.3 + teachingEfficiencyScore * 0.3);
  const summary = `本次诊断共解析 ${scenes.length} 个 scene，检测到 ${concepts.length} 个概念和 ${issues.length} 个主要问题。脚手架稳定性 ${scaffoldStabilityScore}，互动有效性 ${interactionEffectivenessScore}，授课效率 ${teachingEfficiencyScore}，综合得分 ${overallScore}。建议优先处理高阶概念越级、弱目标互动和低价值智能体发言。`;

  const report = CourseDiagnosticReportSchema.parse({
    runId: input.runId,
    topic: input.topic,
    targetLearner: input.targetLearner,
    lessonIndex: input.lessonIndex,
    expectedDurationMinutes: input.expectedDurationMinutes,
    sourceSystem: input.sourceSystem || 'unknown',
    estimatedDurationMinutes,
    scaffoldStabilityScore,
    interactionEffectivenessScore,
    teachingEfficiencyScore,
    overallScore,
    scenes,
    concepts,
    scaffoldIssues,
    interactionEvaluations,
    efficiencyEvaluations,
    issues,
    summary,
    createdAt: new Date().toISOString(),
  });
  await saveReport(report);
  return report;
}
