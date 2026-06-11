import type { CourseGenerationInput } from '@/lib/evaluation/schemas';

const CONTENT_FIELDS = ['outline', 'scenes', 'script', 'classroom', 'agents', 'interactions', 'slides'];

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractObjectContent(result: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const field of CONTENT_FIELDS) {
    if (field in result && result[field] != null) {
      parts.push(`## ${field}\n${stringifyValue(result[field])}`);
    }
  }
  return parts.length > 0 ? parts.join('\n\n') : stringifyValue(result);
}

export function createCourseGenerationInputFromOpenMAICResult(params: {
  jobId: string;
  requirement: string;
  result: unknown;
  sourceSystem?: string;
  targetLearner?: string;
  lessonIndex?: number;
  expectedDurationMinutes?: number;
}): CourseGenerationInput {
  const rawContent = typeof params.result === 'string'
    ? params.result
    : params.result && typeof params.result === 'object'
      ? extractObjectContent(params.result as Record<string, unknown>)
      : stringifyValue(params.result);

  return {
    runId: `openmaic-${params.jobId}`,
    topic: (params.requirement || 'OpenMAIC classroom').slice(0, 80),
    sourceSystem: params.sourceSystem || 'OpenMAIC',
    targetLearner: params.targetLearner || process.env.EVAL_DEFAULT_TARGET_LEARNER || '大学一年级非计算机专业学生',
    lessonIndex: params.lessonIndex || envNumber('EVAL_DEFAULT_LESSON_INDEX', 1),
    expectedDurationMinutes: params.expectedDurationMinutes || envNumber('EVAL_DEFAULT_EXPECTED_DURATION_MINUTES', 10),
    rawContent: rawContent.trim() || '{}',
    createdAt: new Date().toISOString(),
  };
}
