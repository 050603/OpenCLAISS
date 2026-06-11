import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

export interface LLMTraceEvent {
  schemaName: string;
  cacheKey: string;
  cached: boolean;
  mock: boolean;
  ok: boolean;
  rawResponse?: string;
  error?: string;
  createdAt: string;
}

const traceEvents: LLMTraceEvent[] = [];

export function getEvaluationLLMTraceEvents(): LLMTraceEvent[] {
  return [...traceEvents];
}

export function clearEvaluationLLMTraceEvents() {
  traceEvents.length = 0;
}

export interface CallLLMJsonOptions<T> {
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
  zodSchema: z.ZodType<T>;
  temperature?: number;
}

function getEnvNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEvalCacheDir(): string {
  return process.env.EVAL_CACHE_DIR || 'data/eval/cache';
}

function stripCodeFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
}

const EVAL_CACHE_VERSION = 'course-eval-v2';

function cacheKeyFor(schemaName: string, modelName: string, systemPrompt: string, userPrompt: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ version: EVAL_CACHE_VERSION, schemaName, modelName, systemPrompt, userPrompt }))
function cacheKeyFor(schemaName: string, modelName: string, systemPrompt: string, userPrompt: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ schemaName, modelName, systemPrompt, userPrompt }))
    .digest('hex');
}

function sanitizeError(error: unknown): string {
  const apiKey = process.env.LLM_API_KEY;
  let message = error instanceof Error ? error.message : String(error);
  if (apiKey) message = message.split(apiKey).join('[redacted-api-key]');
  return message;
}

function tryParsePromptObject(userPrompt: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(userPrompt) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getMockResponse(schemaName: string, userPrompt = ''): unknown {
  const promptObject = tryParsePromptObject(userPrompt);
  const promptContent = typeof promptObject.content === 'string' ? promptObject.content : userPrompt;
function getMockResponse(schemaName: string): unknown {
  if (schemaName === 'ParsedScenes') {
    return [
      {
        sceneId: 'mock-scene-1',
        sceneIndex: 0,
        sceneType: 'opening',
        speaker: '教师',
        content: '教师：欢迎来到人工智能的奇妙旅程，今天认识人工智能、数据、算法和算力。',
        learningObjective: '认识人工智能三大基石',
        interactionType: null,
        estimatedTimeSeconds: 40,
      },
      {
        sceneId: 'mock-scene-2',
        sceneIndex: 1,
        sceneType: 'explanation',
        speaker: '教师',
        content: '教师：Transformer 依靠多头注意力、位置编码和反向传播来训练大语言模型。',
        learningObjective: '解释高级模型机制',
        interactionType: null,
        estimatedTimeSeconds: 90,
      },
      {
        sceneId: 'mock-scene-3',
        sceneIndex: 2,
        sceneType: 'game',
        speaker: '互动',
        content: '游戏：请把彩色卡片拖到三个盒子里，完成后会出现烟花。目标未说明。',
        learningObjective: '',
        interactionType: 'drag_and_drop',
        estimatedTimeSeconds: 120,
      },
      {
        sceneId: 'mock-scene-4',
        sceneIndex: 3,
        sceneType: 'agent_dialogue',
        speaker: '伴学智能体',
        content: '伴学智能体：太棒了！你真聪明！我也很期待，准备好了吗？让我们一起继续奇妙旅程。',
        learningObjective: '',
        interactionType: null,
        estimatedTimeSeconds: 30,
      },
    ];
  }
  if (schemaName === 'ExtractedConcepts') {
    const concepts: unknown[] = [];
    const add = (concept: string, difficulty: 'basic' | 'intermediate' | 'advanced', evidence = concept) =>
      concepts.push({
        sceneId: 'unknown',
        concept,
        difficulty,
        evidence,
        isAdvancedForBeginners: difficulty !== 'basic',
        confidence: 0.9,
      });
    if (/人工智能|AI/.test(promptContent)) add('人工智能', 'basic');
    if (/数据/.test(promptContent)) add('数据', 'basic');
    if (/算法/.test(promptContent)) add('算法', 'basic');
    if (/算力/.test(promptContent)) add('算力', 'basic');
    if (/Transformer/i.test(promptContent)) add('Transformer', 'advanced');
    if (/多头注意力/.test(promptContent)) add('多头注意力', 'advanced');
    if (/反向传播/.test(promptContent)) add('反向传播', 'advanced');
    if (/梯度下降/.test(promptContent)) add('梯度下降', 'advanced');
    if (/大语言模型|LLM/.test(promptContent)) add('大语言模型', 'advanced');
    return concepts;
  }
  if (schemaName === 'ScaffoldIssue') {
    const baseline = promptObject.ruleBaseline as Record<string, unknown> | undefined;
    if (baseline?.hasIssue === true) {
      return {
        sceneId: typeof baseline.sceneId === 'string' ? baseline.sceneId : 'unknown',
        hasIssue: true,
        severity: typeof baseline.severity === 'number' ? baseline.severity : 4,
        issueType: typeof baseline.issueType === 'string' ? baseline.issueType : 'advanced_concept_intrusion',
        problematicConcepts: Array.isArray(baseline.problematicConcepts) ? baseline.problematicConcepts : ['Transformer'],
        evidence: typeof baseline.evidence === 'string' ? baseline.evidence : '出现高级模型术语',
        reason: '第 1 课面向初学者时展开高级模型机制会产生知识越级。',
        suggestion: '改为只用生活案例解释 AI 三要素，将高级模型机制放到后续课程。',
      };
    }
    return {
      sceneId: typeof baseline?.sceneId === 'string' ? baseline.sceneId : 'unknown',
      hasIssue: false,
      severity: 1,
      issueType: 'none',
      problematicConcepts: [],
      evidence: '',
      reason: 'mock 未发现额外脚手架问题。',
      suggestion: '',
    return [
      {
        sceneId: 'unknown',
        concept: 'Transformer',
        difficulty: 'advanced',
        evidence: 'Transformer',
        isAdvancedForBeginners: true,
        confidence: 0.9,
      },
    ];
  }
  if (schemaName === 'ScaffoldIssue') {
    return {
      sceneId: 'unknown',
      hasIssue: true,
      severity: 4,
      issueType: 'advanced_concept_intrusion',
      problematicConcepts: ['Transformer'],
      evidence: '出现高级模型术语',
      reason: '第 1 课面向初学者时展开 Transformer 会产生知识越级。',
      suggestion: '改为只用生活案例解释 AI 三要素，将 Transformer 放到后续课程。',
    };
  }
  if (schemaName === 'InteractionEvaluation') {
    return {
      sceneId: 'unknown',
      isInteraction: true,
      interactionType: 'drag_and_drop',
      learningGoalAlignment: 2,
      knowledgeActionCoupling: 2,
      extraneousCognitiveLoad: 4,
      necessity: 2,
      timeValue: 2,
      hasWeakGamification: true,
      reason: '拖拽操作与 AI 概念理解关联不足。',
      suggestion: '让学生拖拽数据、算法、算力到具体 AI 应用案例并解释理由。',
    };
  }
  if (schemaName === 'EfficiencyEvaluation') {
    const fillerPhrases = ['太棒了', '非常有趣', '准备好了吗', '让我们一起', '奇妙旅程', '我也很期待', '你真聪明', '别担心', '接下来会很有意思'].filter((phrase) =>
      promptContent.includes(phrase),
    );
    const hasProblem = fillerPhrases.length >= 2;
    return {
      sceneId: 'unknown',
      estimatedTimeSeconds: 30,
      redundantUtteranceRatio: hasProblem ? 0.6 : 0.05,
      fillerPhrases,
      repeatedConcepts: [],
      lowValueAgentTurns: hasProblem ? ['情绪性鼓励未推进学习目标'] : [],
      efficiencyScore: hasProblem ? 45 : 90,
      hasEfficiencyProblem: hasProblem,
      reason: hasProblem ? '寒暄和鼓励占比较高。' : 'mock 未发现明显效率问题。',
      suggestion: hasProblem ? '压缩为一句反馈，并补充具体知识反馈。' : '',
    return {
      sceneId: 'unknown',
      estimatedTimeSeconds: 30,
      redundantUtteranceRatio: 0.6,
      fillerPhrases: ['太棒了', '你真聪明'],
      repeatedConcepts: [],
      lowValueAgentTurns: ['情绪性鼓励未推进学习目标'],
      efficiencyScore: 45,
      hasEfficiencyProblem: true,
      reason: '寒暄和鼓励占比较高。',
      suggestion: '压缩为一句反馈，并补充具体知识反馈。',
    };
  }
  return {};
}

export async function callLLMJson<T>({
  schemaName,
  systemPrompt,
  userPrompt,
  zodSchema,
  temperature = 0.2,
}: CallLLMJsonOptions<T>): Promise<T> {
  const modelName = process.env.LLM_MODEL_NAME || 'mock-model';
  const key = cacheKeyFor(schemaName, modelName, systemPrompt, userPrompt);
  const cachePath = path.join(process.cwd(), getEvalCacheDir(), `${key}.json`);
  const useMock = process.env.EVAL_USE_MOCK_LLM === 'true' || !process.env.LLM_API_KEY;

  try {
    const cached = JSON.parse(await readFile(cachePath, 'utf8')) as { value: unknown; rawResponse?: string; mock?: boolean };
    const parsed = zodSchema.parse(cached.value);
    traceEvents.push({ schemaName, cacheKey: key, cached: true, mock: cached.mock === true, ok: true, rawResponse: cached.rawResponse, createdAt: new Date().toISOString() });
    const cached = JSON.parse(await readFile(cachePath, 'utf8')) as { value: unknown; rawResponse?: string };
    const parsed = zodSchema.parse(cached.value);
    traceEvents.push({ schemaName, cacheKey: key, cached: true, mock: false, ok: true, rawResponse: cached.rawResponse, createdAt: new Date().toISOString() });
    return parsed;
  } catch {
    // Cache miss or stale invalid cache; continue with mock/API call.
  }

  await mkdir(path.dirname(cachePath), { recursive: true });

  if (useMock) {
    const value = zodSchema.parse(getMockResponse(schemaName, userPrompt));
    const rawResponse = JSON.stringify(value);
    await writeFile(cachePath, JSON.stringify({ schemaName, modelName, mock: true, value, rawResponse, createdAt: new Date().toISOString() }, null, 2));
    const value = zodSchema.parse(getMockResponse(schemaName));
    const rawResponse = JSON.stringify(value);
    await writeFile(cachePath, JSON.stringify({ schemaName, modelName, value, rawResponse, createdAt: new Date().toISOString() }, null, 2));
    traceEvents.push({ schemaName, cacheKey: key, cached: false, mock: true, ok: true, rawResponse, createdAt: new Date().toISOString() });
    return value;
  }

  const baseURL = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  if (!baseURL || !apiKey) throw new Error('LLM_BASE_URL and LLM_API_KEY are required when mock mode is disabled.');

  const timeoutMs = getEnvNumber('LLM_TIMEOUT_MS', 60000);
  const maxRetries = Math.max(1, getEnvNumber('LLM_MAX_RETRIES', 2));
  let lastRaw = '';
  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          temperature,
          messages: [
            { role: 'system', content: `${systemPrompt}\nReturn ONLY valid JSON matching schema ${schemaName}.` },
            { role: 'user', content: userPrompt },
          ],
          ...(process.env.LLM_JSON_MODE !== 'false' ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`LLM HTTP ${response.status}: ${await response.text()}`);
      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      lastRaw = payload.choices?.[0]?.message?.content || '';
      const parsedJson = JSON.parse(stripCodeFences(lastRaw));
      const value = zodSchema.parse(parsedJson);
      await writeFile(cachePath, JSON.stringify({ schemaName, modelName, value, rawResponse: lastRaw, createdAt: new Date().toISOString() }, null, 2));
      traceEvents.push({ schemaName, cacheKey: key, cached: false, mock: false, ok: true, rawResponse: lastRaw, createdAt: new Date().toISOString() });
      return value;
    } catch (error) {
      clearTimeout(timer);
      lastError = sanitizeError(error);
      if (attempt === maxRetries) break;
    }
  }

  traceEvents.push({ schemaName, cacheKey: key, cached: false, mock: false, ok: false, rawResponse: lastRaw, error: lastError, createdAt: new Date().toISOString() });
  await writeFile(cachePath.replace(/\.json$/, '.error.json'), JSON.stringify({ schemaName, modelName, rawResponse: lastRaw, error: lastError, createdAt: new Date().toISOString() }, null, 2));
  throw new Error(`LLM JSON call failed for ${schemaName}: ${lastError}`);
}
