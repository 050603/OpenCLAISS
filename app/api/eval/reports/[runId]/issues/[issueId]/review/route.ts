import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSafeEvalId, readCourseDiagnosticReport, writeCourseDiagnosticReport } from '@/lib/evaluation/report-storage';

const ReviewRequestSchema = z.object({
  confirmed: z.boolean(),
  reviewer: z.string().max(100).optional().default(''),
  note: z.string().max(2000).optional().default(''),
});

type RouteContext = { params: Promise<{ runId: string; issueId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { runId, issueId } = await params;
  if (!isSafeEvalId(runId) || !isSafeEvalId(issueId)) return NextResponse.json({ error: 'Invalid runId or issueId' }, { status: 400 });
  const body = ReviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid review payload' }, { status: 400 });

  const report = await readCourseDiagnosticReport(runId);
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  const issueIndex = report.issues.findIndex((issue) => issue.id === issueId);
  if (issueIndex < 0) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });

  const updatedIssue = {
    ...report.issues[issueIndex],
    humanReview: {
      confirmed: body.data.confirmed,
      reviewer: body.data.reviewer,
      note: body.data.note,
      reviewedAt: new Date().toISOString(),
    },
  };
  report.issues[issueIndex] = updatedIssue;
  await writeCourseDiagnosticReport(report);
  return NextResponse.json({ issue: updatedIssue });
}
