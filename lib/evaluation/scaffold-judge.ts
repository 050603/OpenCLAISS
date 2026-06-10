import {
  getConceptRule,
  getMissingPrerequisites,
  isConceptAllowedInLesson,
} from '@/lib/constraints/ai-literacy-concepts';
import { callLLMJson } from '@/lib/evaluation/llm-client';
import { ScaffoldIssueSchema, type CourseGenerationInput, type ExtractedConcept, type ParsedScene, type ScaffoldIssue } from '@/lib/evaluation/schemas';

const HIGH_RISK = ['Transformer', '多头注意力', '反向传播', '梯度下降', '注意力机制'];

function emptyIssue(sceneId: string): ScaffoldIssue {
  return { sceneId, hasIssue: false, severity: 1, issueType: 'none', problematicConcepts: [], evidence: '', reason: '未发现明显知识越级。', suggestion: '' };
}

export async function judgeScaffold(input: CourseGenerationInput, scenes: ParsedScene[], concepts: ExtractedConcept[]): Promise<ScaffoldIssue[]> {
  const results: ScaffoldIssue[] = [];
  const covered: string[] = [];
  for (const scene of scenes) {
    const sceneConcepts = concepts.filter((concept) => concept.sceneId === scene.sceneId && concept.concept !== 'evaluation_failed');
    let issue = emptyIssue(scene.sceneId);
    const problematic = new Set<string>();
    const reasons: string[] = [];
    const evidence: string[] = [];
    let forcedSeverity = 1;
    let issueType: ScaffoldIssue['issueType'] = 'none';

    for (const concept of sceneConcepts) {
      const rule = getConceptRule(concept.concept);
      const missing = getMissingPrerequisites(concept.concept, covered);
      if (!isConceptAllowedInLesson(concept.concept, input.lessonIndex)) {
        forcedSeverity = Math.max(forcedSeverity, 4);
        issueType = 'advanced_concept_intrusion';
        problematic.add(concept.concept);
        evidence.push(concept.evidence);
        reasons.push(`${concept.concept} 允许起始课次为 ${rule?.allowedFromLesson ?? '未知'}，当前为第 ${input.lessonIndex} 课。`);
      }
      if (concept.difficulty === 'advanced' && input.lessonIndex <= 2) {
        forcedSeverity = Math.max(forcedSeverity, 4);
        issueType = 'advanced_concept_intrusion';
        problematic.add(concept.concept);
      }
      if (missing.length > 0 && rule && rule.allowedFromLesson >= input.lessonIndex) {
        forcedSeverity = Math.max(forcedSeverity, 3);
        issueType = issueType === 'none' ? 'missing_prerequisite' : issueType;
        problematic.add(concept.concept);
        reasons.push(`${concept.concept} 缺少先修概念：${missing.join('、')}。`);
      }
      if (HIGH_RISK.some((term) => concept.concept.toLowerCase() === term.toLowerCase()) && /零基础|非计算机|初学/.test(input.targetLearner)) {
        forcedSeverity = Math.max(forcedSeverity, 5);
        issueType = 'advanced_concept_intrusion';
        problematic.add(concept.concept);
      }
    }

    if (forcedSeverity > 1) {
      issue = {
        sceneId: scene.sceneId,
        hasIssue: true,
        severity: forcedSeverity as ScaffoldIssue['severity'],
        issueType,
        problematicConcepts: [...problematic],
        evidence: evidence.filter(Boolean).join('\n') || scene.content.slice(0, 160),
        reason: reasons.join(' '),
        suggestion: '将高级术语后移到具备先修概念后的课次；第 1 课优先使用生活化案例解释 basic 概念。',
      };
    }

    try {
      const llm = await callLLMJson({
        schemaName: 'ScaffoldIssue',
        zodSchema: ScaffoldIssueSchema,
        systemPrompt: '你是 AI 通识课程脚手架诊断器，判断认知跳跃、案例过难和目标偏离。输出 JSON 对象。',
        userPrompt: JSON.stringify({ input, scene, concepts: sceneConcepts, ruleBaseline: issue }),
        temperature: 0.1,
      });
      if (issue.hasIssue) {
        issue = { ...issue, reason: [issue.reason, llm.reason].filter(Boolean).join(' '), suggestion: llm.suggestion || issue.suggestion, severity: Math.max(issue.severity, llm.severity) as ScaffoldIssue['severity'] };
      } else {
        issue = { ...llm, sceneId: scene.sceneId };
      }
    } catch {
      if (!issue.hasIssue) issue = { ...emptyIssue(scene.sceneId), reason: 'LLM 脚手架评估失败，未发现规则级违规。' };
    }
    results.push(issue);
    covered.push(...sceneConcepts.map((concept) => concept.concept));
  }
  return results;
}
