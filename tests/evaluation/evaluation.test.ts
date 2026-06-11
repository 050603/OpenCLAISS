import { mkdtemp, readFile, rm } from 'fs/promises';
import path from 'path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { getMissingPrerequisites, isConceptAllowedInLesson } from '@/lib/constraints/ai-literacy-concepts';
import { fallbackParseScenes } from '@/lib/evaluation/scene-parser';
import { generateReport } from '@/lib/evaluation/report-generator';
import { aggregateReportsBySourceSystem } from '@/lib/evaluation/compare';
import { createCourseGenerationInputFromOpenMAICResult } from '@/lib/evaluation/openmaic-adapter';
import { loadReports, normalizeReport, reportToCsvRows, saveReportToStore, updateIssueHumanReview } from '@/lib/evaluation/report-store';
import type { CourseDiagnosticReport } from '@/lib/evaluation/schemas';

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


let tempEvalReportDir: string | undefined;

function makeReport(overrides: Partial<CourseDiagnosticReport> = {}): CourseDiagnosticReport {
  return {
    runId: 'report-1',
    topic: '人工智能, "测试"\n课程',
    sourceSystem: 'OpenMAIC',
    targetLearner: '大学一年级非计算机专业学生',
    lessonIndex: 1,
    expectedDurationMinutes: 10,
    estimatedDurationMinutes: 8,
    scaffoldStabilityScore: 90,
    interactionEffectivenessScore: 80,
    teachingEfficiencyScore: 70,
    overallScore: 81,
    scenes: [],
    concepts: [],
    scaffoldIssues: [],
    interactionEvaluations: [],
    efficiencyEvaluations: [],
    issues: [
      {
        id: 'issue-1',
        sceneId: 'scene-1',
        issueCategory: 'scaffold',
        issueType: 'advanced_concept_intrusion',
        severity: 'high',
        evidence: 'Transformer',
        reason: 'too early',
        suggestion: 'move later',
      },
    ],
    summary: 'summary',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function useTempReportDir() {
  tempEvalReportDir = await mkdtemp('/tmp/openmaic-eval-reports-');
  process.env.EVAL_REPORT_DIR = tempEvalReportDir;
}

afterEach(async () => {
  if (tempEvalReportDir) await rm(tempEvalReportDir, { recursive: true, force: true });
  tempEvalReportDir = undefined;
  delete process.env.EVAL_REPORT_DIR;
});

afterAll(async () => {
  await rm(path.join(process.cwd(), 'tmp'), { recursive: true, force: true });
  await rm(path.join(process.cwd(), 'workspace'), { recursive: true, force: true });
});

describe('evaluation report store', () => {
  it('returns an empty list for an empty report directory', async () => {
    await useTempReportDir();
    expect(await loadReports()).toEqual([]);
  });

  it('normalizes old reports without sourceSystem', () => {
    const { sourceSystem: _sourceSystem, ...oldReport } = makeReport();
    const normalized = normalizeReport(oldReport);
    expect(normalized?.sourceSystem).toBe('unknown');
  });

  it('updates issue human review in the stored report', async () => {
    await useTempReportDir();
    await saveReportToStore(makeReport());
    const issue = await updateIssueHumanReview({
      runId: 'report-1',
      issueId: 'issue-1',
      review: { confirmed: true, reviewer: '研究者A', note: '确认该问题有效' },
    });
    expect(issue?.humanReview?.confirmed).toBe(true);
    expect(issue?.humanReview?.reviewer).toBe('研究者A');
    expect((await loadReports())[0].issues[0].humanReview?.note).toBe('确认该问题有效');
  });
});

describe('evaluation CSV export', () => {
  it('escapes Chinese text, commas, quotes, and newlines', () => {
    const csv = reportToCsvRows([makeReport()]);
    expect(csv).toContain('"人工智能, ""测试""\n课程"');
  });
});

describe('OpenMAIC evaluation adapter', () => {
  it('converts string results to rawContent', () => {
    const input = createCourseGenerationInputFromOpenMAICResult({ jobId: 'job1', requirement: 'AI basics', result: 'scene text' });
    expect(input.runId).toBe('openmaic-job1');
    expect(input.rawContent).toBe('scene text');
  });

  it('extracts known object fields into rawContent', () => {
    const input = createCourseGenerationInputFromOpenMAICResult({
      jobId: 'job2',
      requirement: 'AI basics',
      result: { outline: 'outline text', scenes: [{ title: 'scene' }], script: 'script text', ignored: 'x' },
    });
    expect(input.rawContent).toContain('## outline');
    expect(input.rawContent).toContain('outline text');
    expect(input.rawContent).toContain('## scenes');
    expect(input.rawContent).toContain('script text');
  });

  it('does not throw when fields are missing', () => {
    expect(() => createCourseGenerationInputFromOpenMAICResult({ jobId: 'job3', requirement: '', result: {} })).not.toThrow();
  });
});

describe('evaluation compare aggregation', () => {
  it('aggregates sample count, averages, and issue counts by sourceSystem', () => {
    const rows = aggregateReportsBySourceSystem([
      makeReport({ runId: 'a', sourceSystem: 'A', overallScore: 80 }),
      makeReport({ runId: 'b', sourceSystem: 'A', overallScore: 90, issues: [
        { ...makeReport().issues[0], id: 'issue-2', issueCategory: 'interaction', humanReview: { confirmed: false } },
      ] }),
    ]);
    expect(rows[0].sourceSystem).toBe('A');
    expect(rows[0].sampleCount).toBe(2);
    expect(rows[0].avgOverallScore).toBe(85);
    expect(rows[0].scaffoldIssueCount).toBe(1);
    expect(rows[0].interactionIssueCount).toBe(1);
    expect(rows[0].reviewedIssueCount).toBe(1);
    expect(rows[0].rejectedIssueCount).toBe(1);
  });
});
