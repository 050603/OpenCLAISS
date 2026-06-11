# OpenMAIC — 开源多智能体交互课堂

OpenMAIC 是由清华大学研发的开源 AI 教育平台，能将任何主题或文档一键转化为沉浸式多智能体交互课堂。上传 PDF 或描述一个主题，OpenMAIC 即可自动调度 AI 教师、AI 助教和 AI 同学，提供包含幻灯片、测验、模拟实验和实时讨论的完整交互课程。

项目基于前沿大语言模型（LLM）技术和 LangGraph 多智能体编排引擎，已在清华大学经过 700+ 名真实学生的验证。

- **多智能体课堂**：不同人格设定的 AI 教师与 AI 同学在真实交互场景中协作——授课讲解、白板绘图、圆桌辩论、实时问答。
- **一键课程生成**：将任意主题或文档（PDF）在几分钟内转化为结构化的交互课程，包含幻灯片、语音讲解、测验和动手活动。
- **丰富的课堂场景**：语音讲解幻灯片、HTML 交互模拟实验、项目制学习（PBL）任务、互动测验等。
- **多格式导出**：可导出为可编辑 .pptx、独立 .html 或课堂数据 ZIP 包。
- **灵活的 LLM 后端**：支持 OpenAI、Anthropic、Google Gemini、DeepSeek、通义千问、MiniMax 及任何 OpenAI 兼容 API。也支持通过 Ollama 本地部署。
- **OpenClaw 集成**：可直接从飞书、Slack、Telegram 等 20+ 聊天应用中生成课堂。

> **注意**：本分支是基于 THU-MAIC/OpenMAIC 的研究分支，新增了非侵入式的 AI 通识课程生成质量诊断模块。诊断模块不会直接改写 OpenMAIC 原有课程生成 pipeline——仅做诊断、日志、评测和报告展示。

## 快速开始

```bash
git clone https://github.com/050603/OpenCLAISS.git
cd OpenCLAISS
pnpm install
cp .env.example .env.local
# 编辑 .env.local，至少配置一个 LLM 提供方的 API key
pnpm dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

---

## 课程生成质量诊断研究模块

本仓库包含一个非侵入式的 **AI 通识课程生成质量诊断模块**，用于研究评测。本阶段只做诊断、日志、评测和报告展示，不会直接改写 OpenMAIC 的课程生成结果。

### 新增内容

新增模块主要位于以下目录：

- `lib/evaluation/` —— 课程诊断主流程、LLM JSON client、scene parser、concept extractor、三类 judge（scaffold/interaction/efficiency）、report generator。
- `lib/constraints/` —— AI 通识教育概念约束表，包含 basic / intermediate / advanced 概念、允许课次和先修关系。
- `lib/traces/` —— 诊断 trace logger。
- `scripts/evaluate-course.ts` —— 命令行批量评测入口。
- `app/eval/runs` —— 诊断报告列表页和详情页。
- `examples/eval/sample-course.txt` —— 带有故意问题的示例课程文本。
- `tests/evaluation/` —— 最小可运行验证测试。

诊断重点覆盖三类问题：

1. **脚手架崩溃 / 知识越级**：例如第 1 课面向零基础学生时提前展开 Transformer、多头注意力、反向传播、梯度下降等高级概念。
2. **无效游戏化 / 互动与学习目标弱相关**：例如拖拽、游戏、模拟只让学生完成物理操作，而没有促进 AI 概念理解。
3. **授课效率低 / 多智能体冗余发言**：例如寒暄、无效鼓励、重复解释、低价值 agent 发言过多。

### 环境要求

- Node.js >= 20
- 推荐 pnpm >= 10；也可以使用 npm 运行 `eval:course` 脚本。

安装依赖：

```bash
pnpm install
# 或者在没有 pnpm 时使用 npm install
```

### 重要：必须在包含 package.json 的仓库根目录运行命令

如果你遇到下面的错误：

```text
npm error enoent Could not read package.json
npm error enoent This is related to npm not being able to find a file.
```

说明当前终端目录不是仓库根目录，而不是诊断模块报错。请先检查：

```bash
pwd
find .. -maxdepth 3 -name package.json -print
```

然后进入真正包含 `package.json` 的 OpenMAIC 仓库根目录，例如：

```bash
cd /path/to/OpenMAIC
# 或你的实际目录名，例如 /workspace/OpenCLAISS
test -f package.json || echo "当前目录没有 package.json，请 cd 到仓库根目录"
```

确认后再运行：

```bash
npm run eval:course:sample
```

另外，请不要把参数名拆成两行；例如 `--sourceSystem` 不能写成 `--sourc\neSystem`。

### 配置 LLM API

复制环境变量文件：

```bash
cp .env.example .env.local
```

诊断模块使用 OpenAI-compatible Chat Completions 接口。在 `.env.local` 中填写：

```env
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=你的真实 API Key
LLM_MODEL_NAME=deepseek-v4-flash
LLM_JSON_MODE=true
LLM_TIMEOUT_MS=60000
LLM_MAX_RETRIES=2

EVAL_STORAGE_MODE=json
EVAL_TRACE_DIR=data/eval/traces
EVAL_REPORT_DIR=data/eval/reports
EVAL_CACHE_DIR=data/eval/cache
EVAL_USE_MOCK_LLM=false
EVAL_AUTO_RUN_AFTER_GENERATION=false
EVAL_DEFAULT_TARGET_LEARNER=大学一年级非计算机专业学生
EVAL_DEFAULT_EXPECTED_DURATION_MINUTES=10
EVAL_DEFAULT_LESSON_INDEX=1
```

注意：

- 不要把真实 API key 提交到 Git。
- 诊断模块不会把 API key 写入报告、trace、cache 或页面。
- 如果没有真实 API，可使用 mock 模式完整跑通流程：

```env
EVAL_USE_MOCK_LLM=true
```

### 运行一次课程诊断

最简单的 mock 示例：

```bash
npm run eval:course:sample
```

等价完整命令：

```bash
EVAL_USE_MOCK_LLM=true npm run eval:course -- \
  --input examples/eval/sample-course.txt \
  --topic "人工智能的三大基石" \
  --targetLearner "大学一年级非计算机专业学生" \
  --lessonIndex 1 \
  --expectedDurationMinutes 10 \
  --sourceSystem "OpenMAIC"
```

真实 LLM 模式：

```bash
npm run eval:course -- \
  --input examples/eval/sample-course.txt \
  --topic "人工智能的三大基石" \
  --targetLearner "大学一年级非计算机专业学生" \
  --lessonIndex 1 \
  --expectedDurationMinutes 10 \
  --sourceSystem "OpenMAIC"
```

命令会输出：

- report 路径
- scaffoldStabilityScore
- interactionEffectivenessScore
- teachingEfficiencyScore
- overallScore
- Top issues

### 在界面中查看诊断结果

启动 Web 应用：

```bash
pnpm dev
# 或 npm run dev
```

打开：

```text
http://localhost:3000
```

首页右上角新增了 **"诊断报告"** 入口。也可以直接访问：

```text
http://localhost:3000/eval/runs
```

页面说明：

- `/eval/runs` —— 列出 `EVAL_REPORT_DIR` 下所有诊断报告。
- `/eval/runs/[runId]` —— 展示课程基本信息、三项核心分数、overallScore、summary、issues、逐 scene 诊断结果。
- 详情页提供 JSON 报告下载链接。

如果页面显示"暂无报告"，请先在仓库根目录运行 `npm run eval:course:sample`，然后刷新页面。

### 输出文件位置

默认本地 JSON 持久化，不引入额外数据库：

```text
data/eval/reports/{runId}.json   # 论文统计和页面展示用报告
data/eval/traces/{runId}.json    # 输入、原文、LLM raw response、错误和中间结果
data/eval/cache/{hash}.json      # LLM JSON 调用缓存，不包含 API key
```

### 如何接入 OpenMAIC 原有课程生成结果

当前第一阶段没有修改原有课程生成 pipeline。后续接入时推荐：

1. 复用 OpenMAIC 生成出的 classroom/stage/scenes。
2. 将 scenes 或导出的课堂文本序列化为 `CourseGenerationInput.rawContent`。
3. 使用原 classroom id 或 job id 作为 `runId`。
4. 调用：

```ts
import { evaluateCourse } from '@/lib/evaluation/evaluate-course';

await evaluateCourse({
  runId,
  topic,
  targetLearner,
  lessonIndex,
  expectedDurationMinutes,
  sourceSystem: 'OpenMAIC',
  rawContent,
  createdAt: new Date().toISOString(),
});
```

这样可以保持 OpenMAIC 原始课程生成格式不变，只额外挂载诊断报告。

### 开发验证命令

```bash
npm run test -- tests/evaluation/evaluation.test.ts
npm run lint
npm run build
npm run eval:course:sample
```

### 当前局限

- 诊断规则和概念表是 baseline，适合第一阶段论文统计，但仍需要结合人工标注持续校准。
- mock 模式只用于无 API 时跑通流程，不代表真实 LLM 诊断质量。
- 当前 UI 以研究评测可用为目标，暂未提供人工复核编辑界面；数据结构已预留 `humanReview` 字段。
- 当前不会自动修改课程生成结果，只生成外部诊断报告。