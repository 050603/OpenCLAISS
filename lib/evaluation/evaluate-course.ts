import { clearEvaluationLLMTraceEvents, getEvaluationLLMTraceEvents } from '@/lib/evaluation/llm-client';
import { extractConcepts } from '@/lib/evaluation/concept-extractor';
import { judgeEfficiency } from '@/lib/evaluation/efficiency-judge';
import { judgeInteractions } from '@/lib/evaluation/interaction-judge';
import { parseScenes } from '@/lib/evaluation/scene-parser';
import { generateReport } from '@/lib/evaluation/report-generator';
import { judgeScaffold } from '@/lib/evaluation/scaffold-judge';
import { CourseGenerationInputSchema, type CourseDiagnosticReport, type CourseGenerationInput } from '@/lib/evaluation/schemas';
import { createRunId, saveTrace } from '@/lib/traces/trace-logger';

export async function evaluateCourse(input: CourseGenerationInput): Promise<CourseDiagnosticReport> {
  clearEvaluationLLMTraceEvents();
  const normalized = CourseGenerationInputSchema.parse({ ...input, runId: createRunId(input.runId) });
  const errors: string[] = [];
  const scenes = await parseScenes(normalized.rawContent).catch((error) => {
    errors.push(`parseScenes: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  });
  const concepts = await extractConcepts(scenes).catch((error) => {
    errors.push(`extractConcepts: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  });
  const scaffoldIssues = await judgeScaffold(normalized, scenes, concepts).catch((error) => {
    errors.push(`judgeScaffold: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  });
  const interactionEvaluations = await judgeInteractions(scenes).catch((error) => {
    errors.push(`judgeInteractions: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  });
  const efficiencyEvaluations = await judgeEfficiency(scenes).catch((error) => {
    errors.push(`judgeEfficiency: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  });
  const report = await generateReport({ input: normalized, scenes, concepts, scaffoldIssues, interactionEvaluations, efficiencyEvaluations });
  await saveTrace(normalized.runId, {
    input: normalized,
    rawContent: normalized.rawContent,
    scenes,
    concepts,
    scaffoldIssues,
    interactionEvaluations,
    efficiencyEvaluations,
    llmResponses: getEvaluationLLMTraceEvents(),
    report,
    errors,
  });
  return report;
}
