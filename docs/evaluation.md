# Course Evaluation Research Diagnostics

OpenMAIC includes a non-intrusive course generation quality diagnostic workflow for research use. It evaluates generated course content, writes JSON reports, supports human issue review, and provides aggregate comparison plus CSV export.

## Run a mock diagnostic

```bash
EVAL_USE_MOCK_LLM=true pnpm run eval:course:sample
```

This uses the sample course under `examples/eval/sample-course.txt` and does not call a real LLM API.

## View reports

Open the report list page:

```text
/eval/runs
```

Each report detail page is available at:

```text
/eval/runs/[runId]
```

## Compare reports

Open the aggregate comparison page:

```text
/eval/compare
```

The page supports simple query-parameter filtering by `topic`, `sourceSystem`, `lessonIndex`, and `targetLearner`.

## Export CSV

Download all report summaries as CSV:

```text
/api/eval/reports/export
```

## Human review for issues

Open a report detail page at `/eval/runs/[runId]`. Each issue card includes a form for marking the issue as confirmed valid or confirmed invalid, plus optional reviewer and note fields.

## Manually diagnose an OpenMAIC classroom job

After a classroom generation job succeeds, trigger evaluation manually:

```http
POST /api/eval/classroom-jobs/[jobId]
```

The API reads the persisted classroom job, converts the generated result into evaluation input, runs the evaluator, and returns scores plus a report URL.

## Environment variables

- `LLM_BASE_URL`: OpenAI-compatible Chat Completions base URL for real evaluation.
- `LLM_API_KEY`: API key for the evaluation LLM. Do not commit real keys.
- `LLM_MODEL_NAME`: Model name used by the evaluation LLM client.
- `LLM_JSON_MODE`: Whether to request JSON-mode responses when supported.
- `LLM_TIMEOUT_MS`: LLM request timeout in milliseconds.
- `LLM_MAX_RETRIES`: Maximum retries for LLM JSON calls.
- `EVAL_TRACE_DIR`: Directory for evaluation traces.
- `EVAL_REPORT_DIR`: Directory for evaluation report JSON files.
- `EVAL_CACHE_DIR`: Directory for evaluation LLM response cache.
- `EVAL_USE_MOCK_LLM`: Set to `true` to use deterministic mock responses.
- `EVAL_DEFAULT_TARGET_LEARNER`: Default target learner used by manual job evaluation.
- `EVAL_DEFAULT_EXPECTED_DURATION_MINUTES`: Default expected duration used by manual job evaluation.
- `EVAL_DEFAULT_LESSON_INDEX`: Default lesson index used by manual job evaluation.
