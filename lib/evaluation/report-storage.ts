import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { CourseDiagnosticReportSchema, type CourseDiagnosticReport } from '@/lib/evaluation/schemas';

export function getEvalReportDir(): string {
  return process.env.EVAL_REPORT_DIR || 'data/eval/reports';
}

export function isSafeEvalId(id: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(id);
}

export function getReportPath(runId: string): string {
  return path.join(process.cwd(), getEvalReportDir(), `${runId}.json`);
}

export function parseCourseDiagnosticReportCompat(value: unknown): CourseDiagnosticReport {
  const object = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return CourseDiagnosticReportSchema.parse({
    ...object,
    sourceSystem:
      typeof object.sourceSystem === 'string' && object.sourceSystem.trim()
        ? object.sourceSystem
        : 'unknown',
  });
}

export async function readCourseDiagnosticReport(runId: string): Promise<CourseDiagnosticReport | null> {
  if (!isSafeEvalId(runId)) return null;
  try {
    return parseCourseDiagnosticReportCompat(JSON.parse(await readFile(getReportPath(runId), 'utf8')));
  } catch {
    return null;
  }
}

export async function listCourseDiagnosticReports(): Promise<CourseDiagnosticReport[]> {
  const dir = path.join(process.cwd(), getEvalReportDir());
  try {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json'));
    const reports = await Promise.all(
      files.map(async (file) => {
        try {
          return parseCourseDiagnosticReportCompat(JSON.parse(await readFile(path.join(dir, file), 'utf8')));
        } catch {
          return null;
        }
      }),
    );
    return reports.filter((report): report is CourseDiagnosticReport => report !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function writeCourseDiagnosticReport(report: CourseDiagnosticReport): Promise<void> {
  const parsed = CourseDiagnosticReportSchema.parse(report);
  await writeFile(getReportPath(parsed.runId), JSON.stringify(parsed, null, 2));
}
