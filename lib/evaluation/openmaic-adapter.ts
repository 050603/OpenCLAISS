import { CourseGenerationInputSchema, type CourseGenerationInput } from '@/lib/evaluation/schemas';

interface AdapterParams {
  jobId: string;
  requirement: string;
  result: unknown;
  sourceSystem?: string;
  targetLearner?: string;
  lessonIndex?: number;
  expectedDurationMinutes?: number;
}

function envNumber(name: string, fallback: number): number {
  const value = process.env[name];
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value ?? '');
  } catch {
    return String(value ?? '');
  }
}

function extractTopic(requirement: string): string {
  const cleaned = requirement.replace(/\s+/g, ' ').trim();
  const quoted = cleaned.match(/[“\"]([^”\"]{2,80})[”\"]/);
  if (quoted?.[1]) return quoted[1];
  const topicMatch = cleaned.match(/(?:主题|topic|课程|教我|讲解|介绍)[:：\s]*([^，。；;\n]{2,80})/i);
  if (topicMatch?.[1]) return topicMatch[1].trim();
  return cleaned.slice(0, 80) || 'OpenMAIC 生成课程';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function titleOf(value: unknown): string {
  if (!isRecord(value)) return '';
  return String(value.title ?? value.name ?? value.id ?? '').trim();
}

function contentOf(value: unknown): string {
  if (!isRecord(value)) return typeof value === 'string' ? value : stringifySafe(value);
  const keys = ['script', 'content', 'text', 'markdown', 'narration', 'description', 'learningObjective'];
  const parts = keys.map((key) => value[key]).filter((item) => typeof item === 'string' && item.trim()) as string[];
  return parts.length > 0 ? parts.join('\n') : stringifySafe(value);
}

function formatArray(label: string, value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  return [`## ${label}`, ...value.map((item, index) => `### ${label} ${index + 1}: ${titleOf(item) || ''}\n${contentOf(item)}`)].join('\n');
}

function extractStructuredRawContent(result: unknown): string {
  if (!isRecord(result)) return stringifySafe(result);
  const sections: string[] = [];
  const directKeys = ['outline', 'outlines', 'scenes', 'agents', 'interactions', 'classroom', 'slides', 'script', 'stage'];
  for (const key of directKeys) {
    const value = result[key];
    if (Array.isArray(value)) {
      const section = formatArray(key, value);
      if (section) sections.push(section);
    } else if (typeof value === 'string' && value.trim()) {
      sections.push(`## ${key}\n${value}`);
    } else if (isRecord(value)) {
      if (key === 'classroom') {
        sections.push(`## classroom\n${extractStructuredRawContent(value)}`);
      } else {
        sections.push(`## ${key}\n${stringifySafe(value)}`);
      }
    }
  }
  if (sections.length > 0) return sections.join('\n\n');
  return stringifySafe(result);
}

export function createCourseGenerationInputFromOpenMAICResult({
  jobId,
  requirement,
  result,
  sourceSystem = 'OpenMAIC',
  targetLearner = process.env.EVAL_DEFAULT_TARGET_LEARNER || '大学一年级非计算机专业学生',
  lessonIndex = envNumber('EVAL_DEFAULT_LESSON_INDEX', 1),
  expectedDurationMinutes = envNumber('EVAL_DEFAULT_EXPECTED_DURATION_MINUTES', 10),
}: AdapterParams): CourseGenerationInput {
  return CourseGenerationInputSchema.parse({
    runId: `openmaic-${jobId}`,
    topic: extractTopic(requirement),
    targetLearner,
    lessonIndex,
    expectedDurationMinutes,
    sourceSystem,
    rawContent: extractStructuredRawContent(result),
    createdAt: new Date().toISOString(),
  });
}
