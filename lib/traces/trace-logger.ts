import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import type { CourseDiagnosticReport, CourseGenerationInput, EfficiencyEvaluation, ExtractedConcept, InteractionEvaluation, ParsedScene, ScaffoldIssue } from '@/lib/evaluation/schemas';
import type { LLMTraceEvent } from '@/lib/evaluation/llm-client';

export interface EvaluationTracePayload {
  input: CourseGenerationInput;
  rawContent: string;
  scenes: ParsedScene[];
  concepts: ExtractedConcept[];
  scaffoldIssues: ScaffoldIssue[];
  interactionEvaluations: InteractionEvaluation[];
  efficiencyEvaluations: EfficiencyEvaluation[];
  llmResponses: LLMTraceEvent[];
  report: CourseDiagnosticReport;
  errors?: string[];
}

export function createRunId(existingRunId?: string): string {
  return existingRunId?.trim() || `eval-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function traceDir(): string {
  return process.env.EVAL_TRACE_DIR || 'data/eval/traces';
}

export async function saveTrace(runId: string, payload: EvaluationTracePayload): Promise<string> {
  const filePath = path.join(process.cwd(), traceDir(), `${runId}.json`);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }, null, 2));
  return filePath;
}
