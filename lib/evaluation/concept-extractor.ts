import { findConceptByKeyword, getConceptRule } from '@/lib/constraints/ai-literacy-concepts';
import { callLLMJson } from '@/lib/evaluation/llm-client';
import { ExtractedConceptsSchema, type ExtractedConcept, type ParsedScene } from '@/lib/evaluation/schemas';

function evidenceFor(text: string, keyword: string): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return keyword;
  return text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + keyword.length + 20));
}

export async function extractConcepts(scenes: ParsedScene[]): Promise<ExtractedConcept[]> {
  const concepts = new Map<string, ExtractedConcept>();
  for (const scene of scenes) {
    try {
      const llmConcepts = await callLLMJson({
        schemaName: 'ExtractedConcepts',
        zodSchema: ExtractedConceptsSchema,
        systemPrompt: '你是 AI 通识教育概念抽取器。只抽取课程文本中明确出现或强暗示的 AI 概念，输出 JSON 数组。',
        userPrompt: JSON.stringify({ sceneId: scene.sceneId, content: scene.content }),
        temperature: 0,
      });
      for (const item of llmConcepts) {
        const normalized: ExtractedConcept = { ...item, sceneId: scene.sceneId };
        concepts.set(`${scene.sceneId}:${normalized.concept.toLowerCase()}`, normalized);
      }
    } catch {
      concepts.set(`${scene.sceneId}:evaluation_failed`, {
        sceneId: scene.sceneId,
        concept: 'evaluation_failed',
        difficulty: 'basic',
        evidence: '概念抽取失败，已降级为规则检测。',
        isAdvancedForBeginners: false,
        confidence: 0,
      });
    }

    for (const rule of findConceptByKeyword(scene.content)) {
      const key = `${scene.sceneId}:${rule.name.toLowerCase()}`;
      if (!concepts.has(key)) {
        const keyword = rule.keywords.find((item) => scene.content.toLowerCase().includes(item.toLowerCase())) || rule.name;
        concepts.set(key, {
          sceneId: scene.sceneId,
          concept: rule.name,
          difficulty: rule.difficulty,
          evidence: evidenceFor(scene.content, keyword),
          isAdvancedForBeginners: rule.difficulty === 'advanced' || !rule.beginnerFriendly,
          confidence: 0.95,
        });
      }
    }
  }
  return [...concepts.values()].filter((concept) => concept.concept !== 'evaluation_failed' || !getConceptRule(concept.concept));
}
