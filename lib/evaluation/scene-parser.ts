import { callLLMJson } from '@/lib/evaluation/llm-client';
import { ParsedScenesSchema, type ParsedScene } from '@/lib/evaluation/schemas';

const MARKER_RE = /^(教师|学生|伴学智能体|智能体|助教|互动|游戏|测验|总结)[:：]/;

export function estimateSceneTimeSeconds(scene: Pick<ParsedScene, 'sceneType' | 'content'>): number {
  const chineseChars = (scene.content.match(/[\u4e00-\u9fa5]/g) || []).length;
  const speechSeconds = Math.ceil((chineseChars / 250) * 60);
  const floorByType: Record<ParsedScene['sceneType'], number> = {
    opening: 30,
    explanation: 30,
    example: 30,
    interaction: 60,
    game: 120,
    quiz: 30,
    agent_dialogue: 30,
    summary: 30,
    other: 20,
  };
  return Math.max(floorByType[scene.sceneType], speechSeconds);
}

function inferSceneType(marker: string, content: string): ParsedScene['sceneType'] {
  if (marker === '互动') return 'interaction';
  if (marker === '游戏') return 'game';
  if (marker === '测验') return 'quiz';
  if (marker === '总结') return 'summary';
  if (['伴学智能体', '智能体', '助教', '学生'].includes(marker)) return 'agent_dialogue';
  if (/例如|案例/.test(content)) return 'example';
  if (/欢迎|导入|开始/.test(content)) return 'opening';
  return 'explanation';
}

export function fallbackParseScenes(rawContent: string): ParsedScene[] {
  const blocks: Array<{ marker: string; text: string }> = [];
  let current: { marker: string; text: string } | null = null;
  for (const line of rawContent.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const match = line.match(MARKER_RE);
    if (match) {
      if (current) blocks.push(current);
      current = { marker: match[1], text: line };
    } else if (current) {
      current.text += `\n${line}`;
    } else {
      current = { marker: '教师', text: line };
    }
  }
  if (current) blocks.push(current);
  const source = blocks.length > 0 ? blocks : [{ marker: '教师', text: rawContent }];
  return source.map((block, index) => {
    const sceneType = inferSceneType(block.marker, block.text);
    const scene: ParsedScene = {
      sceneId: `scene-${index + 1}`,
      sceneIndex: index,
      sceneType,
      speaker: block.marker,
      content: block.text,
      learningObjective: '',
      interactionType: sceneType === 'game' ? 'game' : sceneType === 'interaction' ? 'interaction' : sceneType === 'quiz' ? 'quiz' : null,
      estimatedTimeSeconds: 0,
    };
    scene.estimatedTimeSeconds = estimateSceneTimeSeconds(scene);
    return scene;
  });
}

function normalizeScenes(scenes: ParsedScene[]): ParsedScene[] {
  return scenes.map((scene, index) => {
    const normalized = {
      ...scene,
      sceneId: scene.sceneId || `scene-${index + 1}`,
      sceneIndex: index,
      interactionType: scene.interactionType ?? null,
      estimatedTimeSeconds: estimateSceneTimeSeconds(scene),
    };
    return normalized;
  });
}

export async function parseScenes(rawContent: string): Promise<ParsedScene[]> {
  try {
    const scenes = await callLLMJson({
      schemaName: 'ParsedScenes',
      zodSchema: ParsedScenesSchema,
      systemPrompt: '你是 AI 通识课程结构解析器。请按教学推进顺序把 OpenMAIC 原始课程文本拆分为 ParsedScene JSON 数组，只输出 JSON。要求：1) content 必须保留原文，不改写、不总结；2) sceneType 只能从 schema 枚举中选择；3) 明确识别 opening/explanation/example/interaction/game/quiz/agent_dialogue/summary；4) learningObjective 若文本未说明则填空字符串；5) estimatedTimeSeconds 给出合理估计，普通中文讲解约 250 字/分钟，quiz 约 30 秒，interaction 约 60 秒，game 约 120 秒，多智能体每轮约 30 秒；6) evidence 留在 content 原文中，不要额外输出自由文本。',
      userPrompt: rawContent,
      temperature: 0,
    });
    return normalizeScenes(scenes);
  } catch {
    return fallbackParseScenes(rawContent);
  }
}
