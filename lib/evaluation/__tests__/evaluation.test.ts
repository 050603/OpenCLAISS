import { mkdtemp, readFile, rm } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getMissingPrerequisites, isConceptAllowedInLesson } from '@/lib/constraints/ai-literacy-concepts';
import { evaluateCourse } from '@/lib/evaluation/evaluate-course';
import { generateReport } from '@/lib/evaluation/report-generator';
import { judgeScaffold } from '@/lib/evaluation/scaffold-judge';
import { fallbackParseScenes } from '@/lib/evaluation/scene-parser';
import { createCourseGenerationInputFromOpenMAICResult } from '@/lib/evaluation/openmaic-adapter';
import type { CourseGenerationInput, ExtractedConcept, ParsedScene } from '@/lib/evaluation/schemas';

let tempDir = '';

beforeEach(async () => {
  tempDir = await mkdtemp('/tmp/openmaic-eval-test-');
  process.env.EVAL_USE_MOCK_LLM = 'true';
  process.env.EVAL_REPORT_DIR = path.join(tempDir, 'reports');
  process.env.EVAL_TRACE_DIR = path.join(tempDir, 'traces');
  process.env.EVAL_CACHE_DIR = path.join(tempDir, 'cache');
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('evaluation research platform', () => {
  it('checks AI literacy concept lesson constraints and prerequisites', () => {
    expect(isConceptAllowedInLesson('Transformer', 1)).toBe(false);
    expect(isConceptAllowedInLesson('数据', 1)).toBe(true);
    expect(getMissingPrerequisites('Transformer', ['人工智能', '数据'])).toEqual(expect.arrayContaining(['注意力机制', '神经网络', '深度学习']));
  });

  it('fallback scene parser recognizes game, agent dialogue and quiz scenes', async () => {
    const raw = await readFile('examples/eval/sample-course.txt', 'utf8');
    const scenes = fallbackParseScenes(raw);
    expect(scenes.length).toBeGreaterThan(3);
    expect(scenes.some((scene) => scene.sceneType === 'game')).toBe(true);
    expect(scenes.some((scene) => scene.sceneType === 'agent_dialogue')).toBe(true);
    expect(scenes.some((scene) => scene.sceneType === 'quiz')).toBe(true);
  });

  it('flags Transformer as a high severity scaffold issue for beginner lesson 1', async () => {
    const input: CourseGenerationInput = {
      runId: 'scaffold-unit',
      topic: '人工智能入门',
      targetLearner: '大学一年级非计算机专业学生 / 零基础',
      lessonIndex: 1,
      expectedDurationMinutes: 10,
      sourceSystem: 'unit-test',
      rawContent: '教师：Transformer 通过多头注意力和反向传播训练模型。',
      createdAt: new Date().toISOString(),
    };
    const scenes: ParsedScene[] = [{ sceneId: 's1', sceneIndex: 0, sceneType: 'explanation', speaker: '教师', content: input.rawContent, learningObjective: '', interactionType: null, estimatedTimeSeconds: 60 }];
    const concepts: ExtractedConcept[] = [{ sceneId: 's1', concept: 'Transformer', difficulty: 'advanced', evidence: 'Transformer 通过多头注意力和反向传播', isAdvancedForBeginners: true, confidence: 0.99 }];
    const issues = await judgeScaffold(input, scenes, concepts);
    expect(issues[0]?.hasIssue).toBe(true);
    expect(issues[0]?.severity).toBeGreaterThanOrEqual(4);
  });

  it('generates report scores and issues from mock problems', async () => {
    const report = await generateReport({
      input: { runId: 'report-unit', topic: 'AI', targetLearner: '初学者', lessonIndex: 1, expectedDurationMinutes: 10, sourceSystem: 'unit-test', rawContent: 'raw', createdAt: new Date().toISOString() },
      scenes: [{ sceneId: 's1', sceneIndex: 0, sceneType: 'game', speaker: '互动', content: '游戏：拖拽卡片', learningObjective: '', interactionType: 'drag', estimatedTimeSeconds: 120 }],
      concepts: [],
      scaffoldIssues: [{ sceneId: 's1', hasIssue: true, severity: 4, issueType: 'advanced_concept_intrusion', problematicConcepts: ['Transformer'], evidence: 'Transformer', reason: '越级', suggestion: '后移' }],
      interactionEvaluations: [{ sceneId: 's1', isInteraction: true, interactionType: 'drag', learningGoalAlignment: 2, knowledgeActionCoupling: 2, extraneousCognitiveLoad: 4, necessity: 2, timeValue: 2, hasWeakGamification: true, reason: '弱耦合', suggestion: '改造' }],
      efficiencyEvaluations: [{ sceneId: 's1', estimatedTimeSeconds: 120, redundantUtteranceRatio: 0.3, fillerPhrases: ['太棒了'], repeatedConcepts: [], lowValueAgentTurns: ['太棒了'], efficiencyScore: 45, hasEfficiencyProblem: true, reason: '低效', suggestion: '压缩' }],
    });
    for (const score of [report.scaffoldStabilityScore, report.interactionEffectivenessScore, report.teachingEfficiencyScore, report.overallScore]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.sourceSystem).toBe('unit-test');
  });

  it('evaluates sample course in mock mode and writes report', async () => {
    const raw = await readFile('examples/eval/sample-course.txt', 'utf8');
    const report = await evaluateCourse({ runId: 'mock-smoke', topic: '人工智能的三大基石', targetLearner: '大学一年级非计算机专业学生', lessonIndex: 1, expectedDurationMinutes: 10, sourceSystem: 'OpenMAIC', rawContent: raw, createdAt: new Date().toISOString() });
    expect(report.runId).toBe('mock-smoke');
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it('adapts OpenMAIC generation result without throwing on missing fields', () => {
    const input = createCourseGenerationInputFromOpenMAICResult({
      jobId: 'job123',
      requirement: '请介绍人工智能的三大基石',
      result: { stage: { name: 'AI' }, scenes: [{ title: '导入', content: '教师：人工智能需要数据、算法和算力。' }] },
    });
    expect(input.runId).toBe('openmaic-job123');
    expect(input.rawContent).toContain('教师：人工智能');
  });
});
