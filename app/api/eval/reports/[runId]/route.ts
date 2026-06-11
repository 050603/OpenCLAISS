import { NextResponse } from 'next/server';
import { assertValidRunId, loadReport } from '@/lib/evaluation/report-store';

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;
  try {
    assertValidRunId(runId);
  } catch {
    return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
  }
  const report = await loadReport(runId);
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  return new NextResponse(JSON.stringify(report, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${runId}.json"`,
    },
  });
}
