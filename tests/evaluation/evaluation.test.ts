import { readFile } from 'fs/promises';
import { describe, expect, it } from 'vitest';
import { getMissingPrerequisites, isConceptAllowedInLesson } from '@/lib/constraints/ai-literacy-concepts';
import { fallbackParseScenes } from '@/lib/evaluation/scene-parser';
import { generateReport } from '@/lib/evaluation/report-generator';

describe('course evaluation baseline checks', () => {
  it('disallows Transformer in lesson 1', () => {
    expect(isConceptAllowedInLesson('Transformer', 1)).toBe(false);
  });

  it('detects missing prerequisites for Transformer', () => {
    expect(getMissingPrerequisites('Transformer', ['人工智能', '数据'])).toContain('注意力机制');
  });

  it('fallback scene parser splits sample course into multiple scenes', async () => {
    const raw = await readFile('examples/eval/sample-course.txt', 'utf8');
    expect(fallbackParseScenes(raw).length).toBeGreaterThan(3);
  });

  it('report generator emits bounded scores', async () => {
    const report = await generateReport({
      input: {
        runId: 'unit-test-report',
        topic: '人工智能的三大基石',
        targetLearner: '大学一年级非计算机专业学生',
        lessonIndex: 1,
        expectedDurationMinutes: 10,
        sourceSystem: 'OpenMAIC',
        rawContent: '教师：人工智能。',
        createdAt: new Date().toISOString(),
      },
      scenes: [
        { sceneId: 's1', sceneIndex: 0, sceneType: 'explanation', speaker: '教师', content: '教师：人工智能。', learningObjective: '', interactionType: null, estimatedTimeSeconds: 30 },
      ],
      concepts: [],
      scaffoldIssues: [],
      interactionEvaluations: [],
      efficiencyEvaluations: [],
    });
    for (const score of [report.scaffoldStabilityScore, report.interactionEffectivenessScore, report.teachingEfficiencyScore, report.overallScore]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
