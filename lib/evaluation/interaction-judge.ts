import { callLLMJson } from '@/lib/evaluation/llm-client';
import { InteractionEvaluationSchema, type InteractionEvaluation, type ParsedScene } from '@/lib/evaluation/schemas';

const INTERACTION_TYPES = new Set(['interaction', 'game', 'quiz', 'agent_dialogue']);

function defaultEvaluation(scene: ParsedScene, isInteraction: boolean): InteractionEvaluation {
  return {
    sceneId: scene.sceneId,
    isInteraction,
    interactionType: scene.interactionType,
    learningGoalAlignment: isInteraction ? 3 : 5,
    knowledgeActionCoupling: isInteraction ? 3 : 5,
    extraneousCognitiveLoad: isInteraction ? 3 : 1,
    necessity: isInteraction ? 3 : 5,
    timeValue: isInteraction ? 3 : 5,
    hasWeakGamification: false,
    reason: isInteraction ? '已按互动任务进行评估。' : '非互动 scene，不参与无效游戏化评估。',
    suggestion: '',
  };
}

function applyRules(scene: ParsedScene, evaluation: InteractionEvaluation): InteractionEvaluation {
  const result = { ...evaluation, sceneId: scene.sceneId, isInteraction: INTERACTION_TYPES.has(scene.sceneType) };
  if (!result.isInteraction) return result;
  const gameInstructionLength = scene.sceneType === 'game' ? scene.content.length : 0;
  if (!scene.learningObjective.trim()) {
    result.hasWeakGamification = true;
    result.learningGoalAlignment = Math.min(result.learningGoalAlignment, 2) as InteractionEvaluation['learningGoalAlignment'];
    result.reason += ' 互动缺少明确 learningObjective。';
  }
  if (result.learningGoalAlignment <= 2 && result.knowledgeActionCoupling <= 2) result.hasWeakGamification = true;
  if (result.extraneousCognitiveLoad >= 4 && result.timeValue <= 2) result.hasWeakGamification = true;
  if (gameInstructionLength > 180 && !/数据|算法|模型|预测|分类|识别/.test(scene.content)) {
    result.hasWeakGamification = true;
    result.reason += ' 游戏说明较长但知识词较少。';
  }
  if (result.hasWeakGamification && !result.suggestion) result.suggestion = '重写互动任务，使操作对象直接对应 AI 概念并要求学生解释选择理由。';
  return result;
}

export async function judgeInteractions(scenes: ParsedScene[]): Promise<InteractionEvaluation[]> {
  const results: InteractionEvaluation[] = [];
  for (const scene of scenes) {
    const isInteraction = INTERACTION_TYPES.has(scene.sceneType);
    if (!isInteraction) {
      results.push(defaultEvaluation(scene, false));
      continue;
    }
    try {
      const llm = await callLLMJson({
        schemaName: 'InteractionEvaluation',
        zodSchema: InteractionEvaluationSchema,
        systemPrompt: '你是课程互动有效性评估器，从目标对齐、知识动作耦合、外在认知负荷、必要性和时间价值五个 1-5 维度评分。输出 JSON。',
        userPrompt: JSON.stringify(scene),
        temperature: 0.1,
      });
      results.push(applyRules(scene, { ...llm, sceneId: scene.sceneId }));
    } catch {
      results.push({ ...applyRules(scene, defaultEvaluation(scene, true)), reason: '该项评估失败，已使用规则兜底。' });
    }
  }
  return results;
}
