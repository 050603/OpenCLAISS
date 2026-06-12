import type { ExtractedConcept } from '@/lib/evaluation/schemas';

export type ConceptDifficulty = 'basic' | 'intermediate' | 'advanced';

export interface AILiteracyConceptRule {
  name: string;
  difficulty: ConceptDifficulty;
  prerequisites: string[];
  allowedFromLesson: number;
  beginnerFriendly: boolean;
  keywords: string[];
}

export const AI_LITERACY_CONCEPTS: AILiteracyConceptRule[] = [
  { name: '人工智能', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['人工智能', 'AI'] },
  { name: '数据', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['数据'] },
  { name: '算法', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['算法'] },
  { name: '算力', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['算力', '计算能力'] },
  { name: '模型', difficulty: 'basic', prerequisites: ['数据'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['模型'] },
  { name: '预测', difficulty: 'basic', prerequisites: ['数据'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['预测'] },
  { name: '分类', difficulty: 'basic', prerequisites: ['数据'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['分类'] },
  { name: '识别', difficulty: 'basic', prerequisites: ['数据'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['识别'] },
  { name: '自动化', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['自动化'] },
  { name: '训练样本', difficulty: 'basic', prerequisites: ['数据'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['训练样本', '样本'] },
  { name: '应用场景', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['应用场景', '场景'] },
  { name: '人脸识别', difficulty: 'basic', prerequisites: ['识别'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['人脸识别'] },
  { name: '语音助手', difficulty: 'basic', prerequisites: ['识别'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['语音助手', '智能音箱'] },
  { name: '推荐系统', difficulty: 'basic', prerequisites: ['预测'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['推荐系统', '个性化推荐'] },
  { name: '规则', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['规则'] },
  { name: '输入', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['输入'] },
  { name: '输出', difficulty: 'basic', prerequisites: [], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['输出'] },
  { name: '智能体', difficulty: 'basic', prerequisites: ['人工智能'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['智能体', 'agent', 'Agent'] },
  { name: '生成式 AI', difficulty: 'basic', prerequisites: ['人工智能'], allowedFromLesson: 1, beginnerFriendly: true, keywords: ['生成式 AI', '生成式AI', 'AIGC'] },
  { name: '机器学习', difficulty: 'intermediate', prerequisites: ['数据', '模型', '训练样本'], allowedFromLesson: 2, beginnerFriendly: false, keywords: ['机器学习'] },
  { name: '监督学习', difficulty: 'intermediate', prerequisites: ['机器学习', '标签'], allowedFromLesson: 3, beginnerFriendly: false, keywords: ['监督学习'] },
  { name: '无监督学习', difficulty: 'intermediate', prerequisites: ['机器学习'], allowedFromLesson: 3, beginnerFriendly: false, keywords: ['无监督学习'] },
  { name: '训练集', difficulty: 'intermediate', prerequisites: ['训练样本'], allowedFromLesson: 2, beginnerFriendly: false, keywords: ['训练集'] },
  { name: '测试集', difficulty: 'intermediate', prerequisites: ['训练集'], allowedFromLesson: 2, beginnerFriendly: false, keywords: ['测试集'] },
  { name: '特征', difficulty: 'intermediate', prerequisites: ['数据'], allowedFromLesson: 2, beginnerFriendly: false, keywords: ['特征'] },
  { name: '标签', difficulty: 'intermediate', prerequisites: ['数据'], allowedFromLesson: 2, beginnerFriendly: false, keywords: ['标签'] },
  { name: '准确率', difficulty: 'intermediate', prerequisites: ['预测', '分类'], allowedFromLesson: 2, beginnerFriendly: false, keywords: ['准确率'] },
  { name: '过拟合', difficulty: 'intermediate', prerequisites: ['训练集', '测试集'], allowedFromLesson: 4, beginnerFriendly: false, keywords: ['过拟合'] },
  { name: '神经网络', difficulty: 'intermediate', prerequisites: ['机器学习', '模型'], allowedFromLesson: 4, beginnerFriendly: false, keywords: ['神经网络'] },
  { name: '深度学习', difficulty: 'intermediate', prerequisites: ['神经网络'], allowedFromLesson: 4, beginnerFriendly: false, keywords: ['深度学习'] },
  { name: '参数', difficulty: 'intermediate', prerequisites: ['模型'], allowedFromLesson: 3, beginnerFriendly: false, keywords: ['参数'] },
  { name: '损失函数', difficulty: 'intermediate', prerequisites: ['模型', '准确率'], allowedFromLesson: 4, beginnerFriendly: false, keywords: ['损失函数', '损失'] },
  { name: '提示词', difficulty: 'intermediate', prerequisites: ['生成式 AI'], allowedFromLesson: 2, beginnerFriendly: true, keywords: ['提示词', 'prompt', 'Prompt'] },
  { name: '幻觉', difficulty: 'intermediate', prerequisites: ['生成式 AI'], allowedFromLesson: 2, beginnerFriendly: true, keywords: ['幻觉'] },
  { name: '偏见', difficulty: 'intermediate', prerequisites: ['数据'], allowedFromLesson: 2, beginnerFriendly: true, keywords: ['偏见'] },
  { name: '隐私', difficulty: 'intermediate', prerequisites: ['数据'], allowedFromLesson: 2, beginnerFriendly: true, keywords: ['隐私'] },
  { name: '反向传播', difficulty: 'advanced', prerequisites: ['神经网络', '损失函数', '梯度下降'], allowedFromLesson: 6, beginnerFriendly: false, keywords: ['反向传播', 'backpropagation'] },
  { name: '梯度下降', difficulty: 'advanced', prerequisites: ['损失函数', '参数'], allowedFromLesson: 5, beginnerFriendly: false, keywords: ['梯度下降'] },
  { name: '卷积神经网络', difficulty: 'advanced', prerequisites: ['神经网络', '深度学习'], allowedFromLesson: 6, beginnerFriendly: false, keywords: ['卷积神经网络', 'CNN'] },
  { name: '循环神经网络', difficulty: 'advanced', prerequisites: ['神经网络', '深度学习'], allowedFromLesson: 6, beginnerFriendly: false, keywords: ['循环神经网络', 'RNN'] },
  { name: '注意力机制', difficulty: 'advanced', prerequisites: ['神经网络', '深度学习'], allowedFromLesson: 6, beginnerFriendly: false, keywords: ['注意力机制', 'Attention'] },
  { name: 'Transformer', difficulty: 'advanced', prerequisites: ['注意力机制', '神经网络', '深度学习'], allowedFromLesson: 7, beginnerFriendly: false, keywords: ['Transformer', 'transformer'] },
  { name: '多头注意力', difficulty: 'advanced', prerequisites: ['Transformer', '注意力机制'], allowedFromLesson: 7, beginnerFriendly: false, keywords: ['多头注意力', 'multi-head attention'] },
  { name: '位置编码', difficulty: 'advanced', prerequisites: ['Transformer'], allowedFromLesson: 7, beginnerFriendly: false, keywords: ['位置编码'] },
  { name: 'Token', difficulty: 'advanced', prerequisites: ['生成式 AI'], allowedFromLesson: 5, beginnerFriendly: false, keywords: ['Token', 'token'] },
  { name: 'Embedding', difficulty: 'advanced', prerequisites: ['Token', '模型'], allowedFromLesson: 6, beginnerFriendly: false, keywords: ['Embedding', '嵌入向量', '词嵌入'] },
  { name: '大语言模型', difficulty: 'advanced', prerequisites: ['生成式 AI', '神经网络'], allowedFromLesson: 5, beginnerFriendly: false, keywords: ['大语言模型', 'LLM'] },
  { name: '微调', difficulty: 'advanced', prerequisites: ['大语言模型', '训练集'], allowedFromLesson: 7, beginnerFriendly: false, keywords: ['微调', 'fine-tuning'] },
  { name: 'RAG', difficulty: 'advanced', prerequisites: ['大语言模型', 'Embedding'], allowedFromLesson: 7, beginnerFriendly: false, keywords: ['RAG', '检索增强生成'] },
  { name: 'Scaling Law', difficulty: 'advanced', prerequisites: ['大语言模型', '参数'], allowedFromLesson: 8, beginnerFriendly: false, keywords: ['Scaling Law', '规模定律'] },
  { name: '对齐', difficulty: 'advanced', prerequisites: ['大语言模型'], allowedFromLesson: 7, beginnerFriendly: false, keywords: ['对齐', 'alignment'] },
  { name: 'RLHF', difficulty: 'advanced', prerequisites: ['大语言模型', '对齐'], allowedFromLesson: 8, beginnerFriendly: false, keywords: ['RLHF', '人类反馈强化学习'] },
  { name: '强化学习', difficulty: 'advanced', prerequisites: ['机器学习'], allowedFromLesson: 6, beginnerFriendly: false, keywords: ['强化学习'] },
  { name: '扩散模型', difficulty: 'advanced', prerequisites: ['深度学习'], allowedFromLesson: 7, beginnerFriendly: false, keywords: ['扩散模型', 'Diffusion'] },
];

export function findConceptByKeyword(text: string): AILiteracyConceptRule[] {
  const normalized = text.toLowerCase();
  return AI_LITERACY_CONCEPTS.filter((concept) =>
    concept.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
}

export function getConceptRule(conceptName: string): AILiteracyConceptRule | undefined {
  const normalized = conceptName.toLowerCase();
  return AI_LITERACY_CONCEPTS.find(
    (concept) =>
      concept.name.toLowerCase() === normalized ||
      concept.keywords.some((keyword) => keyword.toLowerCase() === normalized),
  );
}

export function isConceptAllowedInLesson(conceptName: string, lessonIndex: number): boolean {
  const rule = getConceptRule(conceptName);
  if (!rule) return true;
  if (lessonIndex === 1 && rule.difficulty !== 'basic') return false;
  return rule.allowedFromLesson <= lessonIndex;
}

export function getMissingPrerequisites(
  conceptName: string,
  coveredConcepts: Array<string | ExtractedConcept>,
): string[] {
  const rule = getConceptRule(conceptName);
  if (!rule) return [];
  const covered = new Set(
    coveredConcepts.map((item) => (typeof item === 'string' ? item : item.concept).toLowerCase()),
  );
  return rule.prerequisites.filter((prerequisite) => !covered.has(prerequisite.toLowerCase()));
}
