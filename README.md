# OpenMAIC — Open Multi-Agent Interactive Classroom

OpenMAIC is an open-source AI education platform developed by Tsinghua University that transforms any topic or document into an immersive, multi-agent interactive classroom in one click. Upload a PDF or describe a topic, and OpenMAIC automatically orchestrates AI teachers, teaching assistants, and classmates to deliver fully interactive lessons with slides, quizzes, simulations, and real-time discussions.

Built on cutting-edge large language model (LLM) technology with a LangGraph-based multi-agent orchestration engine, OpenMAIC has been validated with over 700 real students at Tsinghua University.

- **Multi-Agent Classroom**: AI teacher and AI classmates with distinct personalities collaborate in realistic interaction scenarios — lectures, whiteboard drawing, roundtable debates, and real-time Q&A.
- **One-Click Lesson Generation**: Transform any topic or document (PDF) into a structured, interactive lesson with slides, voice narration, quizzes, and hands-on activities in minutes.
- **Rich Scene Types**: Slides with voice narration, HTML interactive simulations, project-based learning (PBL) tasks, interactive quizzes, and more.
- **Multi-Format Export**: Export lessons as editable .pptx, standalone .html, or classroom data ZIP packages.
- **Flexible LLM Backend**: Supports OpenAI, Anthropic, Google Gemini, DeepSeek, Qwen, MiniMax, and any OpenAI-compatible API. Local deployment via Ollama is also supported.
- **OpenClaw Integration**: Generate classrooms directly from Feishu, Slack, Telegram, and 20+ messaging apps.

> **Note**: This branch is a research fork based on THU-MAIC/OpenMAIC that adds a non-intrusive course generation quality diagnostic module. The diagnostic module does NOT modify the original course generation pipeline — it only evaluates, logs, and reports.

## Quick Start

```bash
git clone https://github.com/050603/OpenCLAISS.git
cd OpenCLAISS
pnpm install
cp .env.example .env.local
# Edit .env.local with at least one LLM provider API key
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Course Evaluation / Research Diagnostics

This repository includes a **non-intrusive AI literacy course generation quality diagnostic module** for research evaluation. It does NOT rewrite OpenMAIC course generation results — it only performs diagnostics, logging, evaluation, and report display.

### What's Added

New modules are located under:

- `lib/evaluation/` — Course diagnostic pipeline, LLM JSON client, scene parser, concept extractor, three judges (scaffold/interaction/efficiency), report generator.
- `lib/constraints/` — AI literacy education concept constraint table with basic/intermediate/advanced concepts, allowed lesson index, and prerequisite relationships.
- `lib/traces/` — Diagnostic trace logger.
- `scripts/evaluate-course.ts` — CLI batch evaluation entry point.
- `app/eval/runs` — Diagnostic report list and detail pages.
- `examples/eval/sample-course.txt` — Sample course text with intentional issues.
- `tests/evaluation/` — Minimal runnable verification tests.

The diagnostic module focuses on three categories of issues:

1. **Scaffold collapse / knowledge leap**: e.g., introducing Transformer, multi-head attention, backpropagation, or gradient descent in Lesson 1 for beginners.
2. **Weak gamification / interaction weakly aligned with learning goals**: e.g., drag-and-drop, games, or simulations that only ask for physical actions without promoting AI concept understanding.
3. **Low teaching efficiency / redundant agent speech**: e.g., excessive pleasantries, ineffective encouragement, repeated explanations, low-value agent turns.

### Environment Requirements

- Node.js >= 20
- pnpm >= 10 recommended; npm also works for running `eval:course` scripts.

### Important: Run Commands from the Repository Root

If you encounter the following error:

```text
npm error enoent Could not read package.json
npm error enoent This is related to npm not being able to find a file.
```

It means your terminal directory is NOT the repository root. Check:

```bash
pwd
find .. -maxdepth 3 -name package.json -print
```

Then cd to the OpenMAIC repository root (where package.json is located) and retry.

### Configure LLM API

Copy the environment variable file:

```bash
cp .env.example .env.local
```

The evaluation module uses an OpenAI-compatible Chat Completions endpoint. In `.env.local`:

```env
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=your-real-api-key
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
EVAL_DEFAULT_TARGET_LEARNER=university-first-year-non-cs
EVAL_DEFAULT_EXPECTED_DURATION_MINUTES=10
EVAL_DEFAULT_LESSON_INDEX=1
```

Notes:

- Never commit real API keys to Git.
- The diagnostic module never writes API keys into reports, traces, caches, or pages.
- If you don't have a real API, use mock mode to run the full pipeline:

```env
EVAL_USE_MOCK_LLM=true
```

### Run a Course Diagnostic

Simplest mock example:

```bash
npm run eval:course:sample
```

Equivalent full command:

```bash
EVAL_USE_MOCK_LLM=true npm run eval:course -- \
  --input examples/eval/sample-course.txt \
  --topic "Three Pillars of AI" \
  --targetLearner "university-first-year-non-cs" \
  --lessonIndex 1 \
  --expectedDurationMinutes 10 \
  --sourceSystem "OpenMAIC"
```

Real LLM mode:

```bash
npm run eval:course -- \
  --input examples/eval/sample-course.txt \
  --topic "Three Pillars of AI" \
  --targetLearner "university-first-year-non-cs" \
  --lessonIndex 1 \
  --expectedDurationMinutes 10 \
  --sourceSystem "OpenMAIC"
```

Command output includes:

- Report path
- scaffoldStabilityScore
- interactionEffectivenessScore
- teachingEfficiencyScore
- overallScore
- Top issues

### View Diagnostic Results in the UI

Start the web app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The top-right corner has a **"Diagnostic Reports"** entry. You can also directly visit:

```
http://localhost:3000/eval/runs
```

Page descriptions:

- `/eval/runs` — Lists all diagnostic reports under `EVAL_REPORT_DIR`.
- `/eval/runs/[runId]` — Displays basic course info, three core scores, overallScore, summary, issues, and per-scene diagnostic results.
- The detail page provides a JSON report download link.

If the page shows "No reports available", run `npm run eval:course:sample` from the repository root first, then refresh.

### Output File Locations

Default local JSON persistence, no additional database required:

```text
data/eval/reports/{runId}.json   # Reports for statistics and page display
data/eval/traces/{runId}.json    # Input, raw content, LLM raw responses, errors, intermediate results
data/eval/cache/{hash}.json      # LLM JSON call cache (no API keys)
```

### Integrating with OpenMAIC Course Generation Results

The current phase does not modify the original course generation pipeline. For future integration:

1. Reuse OpenMAIC-generated classroom/stage/scenes.
2. Serialize scenes or exported classroom text into `CourseGenerationInput.rawContent`.
3. Use the original classroom id or job id as `runId`.
4. Call:

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

This keeps the original OpenMAIC course generation format unchanged while attaching diagnostic reports externally.

### Development Verification Commands

```bash
npm run test -- tests/evaluation/evaluation.test.ts
npm run lint
npm run build
npm run eval:course:sample
```

### Current Limitations

- Diagnostic rules and concept tables are baseline-level, suitable for first-phase paper statistics but still require continuous calibration with human annotation.
- Mock mode is only for running the pipeline without an API — it does not represent real LLM diagnostic quality.
- The current UI targets research evaluation usability; human review editing interface is not yet provided. The data structure reserves the `humanReview` field.
- The diagnostic module does not automatically modify course generation results — it only produces external diagnostic reports.