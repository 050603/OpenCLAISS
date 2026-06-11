import { callLLMJson } from '@/lib/evaluation/llm-client';
import { EfficiencyEvaluationSchema, type EfficiencyEvaluation, type ParsedScene } from '@/lib/evaluation/schemas';

const FILLER_PHRASES = ['太棒了', '非常有趣', '准备好了吗', '让我们一起', '奇妙旅程', '我也很期待', '你真聪明', '别担心', '接下来会很有意思'];
const KNOWLEDGE_TERMS = /人工智能|数据|算法|算力|模型|预测|分类|识别|训练|样本|应用|案例|反馈|纠错|任务/;

function ruleEvaluate(scene: ParsedScene): EfficiencyEvaluation {
  const fillerPhrases = FILLER_PHRASES.filter((phrase) => scene.content.includes(phrase));
  const lowValue = fillerPhrases.length > 0 && !KNOWLEDGE_TERMS.test(scene.content);
  const redundantUtteranceRatio = Math.min(1, fillerPhrases.join('').length / Math.max(1, scene.content.length));
  return {
    sceneId: scene.sceneId,
    estimatedTimeSeconds: scene.estimatedTimeSeconds,
    redundantUtteranceRatio,
    fillerPhrases,
    repeatedConcepts: [],
    lowValueAgentTurns: lowValue ? [scene.content.slice(0, 120)] : [],
    efficiencyScore: lowValue ? 45 : Math.max(60, 100 - Math.round(redundantUtteranceRatio * 60)),
    hasEfficiencyProblem: lowValue || fillerPhrases.length >= 3 || redundantUtteranceRatio > 0.3,
    reason: lowValue ? '该 scene 主要是情绪性鼓励，没有新知识、反馈、纠错或任务推进。' : '未发现明显低效发言。',
    suggestion: lowValue ? '删除或压缩寒暄，替换为具体知识反馈或下一步学习指令。' : '',
  };
}

function mergeRuleAndLLM(rule: EfficiencyEvaluation, llm: EfficiencyEvaluation): EfficiencyEvaluation {
  return {
    ...llm,
    sceneId: rule.sceneId,
    estimatedTimeSeconds: rule.estimatedTimeSeconds,
    redundantUtteranceRatio: Math.max(rule.redundantUtteranceRatio, llm.redundantUtteranceRatio),
    fillerPhrases: [...new Set([...rule.fillerPhrases, ...llm.fillerPhrases])],
    lowValueAgentTurns: [...new Set([...rule.lowValueAgentTurns, ...llm.lowValueAgentTurns])],
    efficiencyScore: Math.min(rule.efficiencyScore, llm.efficiencyScore),
    hasEfficiencyProblem: rule.hasEfficiencyProblem || llm.hasEfficiencyProblem,
    reason: [rule.reason, llm.reason].filter(Boolean).join(' '),
    suggestion: llm.suggestion || rule.suggestion,
  };
}

export async function judgeEfficiency(scenes: ParsedScene[]): Promise<EfficiencyEvaluation[]> {
  const results: EfficiencyEvaluation[] = [];
  for (const scene of scenes) {
    const rule = ruleEvaluate(scene);
    try {
      const llm = await callLLMJson({
        schemaName: 'EfficiencyEvaluation',
        zodSchema: EfficiencyEvaluationSchema,
        systemPrompt: '你是授课效率诊断器。只输出符合 schema 的 JSON 对象。中文评分 rubric：efficiencyScore 0-100，100=每句话都推进学习目标，70=少量冗余，50=冗余明显，30 以下=大量低价值发言。必须区分效率问题：social filler 客套寒暄、repeated explanation 重复解释、low-value agent turn 低价值智能体发言、overlong opening 过长开场、overlong transition 过长转场、inefficient interaction flow 低效互动流程。fillerPhrases 必须来自原文，lowValueAgentTurns 保留原文短证据，reason 不要泛泛而谈。不要输出 markdown。',
        userPrompt: JSON.stringify(scene),
        temperature: 0.1,
      });
      results.push(mergeRuleAndLLM(rule, llm));
    } catch {
      results.push({ ...rule, reason: `${rule.reason} 该项评估失败，已使用规则兜底。` });
    }
  }
  return results;
}
