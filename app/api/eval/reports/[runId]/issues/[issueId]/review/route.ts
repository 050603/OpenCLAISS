import { NextResponse } from 'next/server';
import { assertValidRunId, loadReport, updateIssueHumanReview } from '@/lib/evaluation/report-store';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ runId: string; issueId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { runId, issueId } = await params;
  try {
    assertValidRunId(runId);
  } catch {
    return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
  }
  if (!issueId.trim()) return NextResponse.json({ error: 'Invalid issueId' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || typeof (body as { confirmed?: unknown }).confirmed !== 'boolean') {
    return NextResponse.json({ error: 'Invalid review body' }, { status: 400 });
  }

  try {
    const report = await loadReport(runId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    if (!report.issues.some((issue) => issue.id === issueId)) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    const updated = await updateIssueHumanReview({
      runId,
      issueId,
      review: {
        confirmed: (body as { confirmed: boolean }).confirmed,
        reviewer: typeof (body as { reviewer?: unknown }).reviewer === 'string' ? (body as { reviewer: string }).reviewer : undefined,
        note: typeof (body as { note?: unknown }).note === 'string' ? (body as { note: string }).note : undefined,
      },
    });
    if (!updated) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    return NextResponse.json({ issue: updated });
  } catch {
    return NextResponse.json({ error: 'Failed to update human review' }, { status: 500 });
  }
}
