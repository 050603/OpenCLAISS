import { readFile } from 'fs/promises';
import path from 'path';
import { evaluateCourse } from '@/lib/evaluation/evaluate-course';
import { createRunId } from '@/lib/traces/trace-logger';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      args[token.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) throw new Error('Missing --input path');
  const rawContent = await readFile(path.resolve(process.cwd(), args.input), 'utf8');
  const runId = createRunId(args.runId);
  const report = await evaluateCourse({
    runId,
    topic: args.topic || '未命名课程',
    targetLearner: args.targetLearner || '初学者',
    lessonIndex: Number(args.lessonIndex || 1),
    expectedDurationMinutes: Number(args.expectedDurationMinutes || 10),
    sourceSystem: args.sourceSystem || 'OpenMAIC',
    rawContent,
    createdAt: new Date().toISOString(),
  });
  const reportPath = path.join(process.cwd(), process.env.EVAL_REPORT_DIR || 'data/eval/reports', `${report.runId}.json`);
  console.log(`Report: ${reportPath}`);
  console.log(`Scaffold Stability: ${report.scaffoldStabilityScore}`);
  console.log(`Interaction Effectiveness: ${report.interactionEffectivenessScore}`);
  console.log(`Teaching Efficiency: ${report.teachingEfficiencyScore}`);
  console.log(`Overall: ${report.overallScore}`);
  console.log('Top issues:');
  for (const issue of report.issues.slice(0, 5)) {
    console.log(`- [${issue.severity}] ${issue.issueCategory}/${issue.issueType} @ ${issue.sceneId}: ${issue.reason}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
