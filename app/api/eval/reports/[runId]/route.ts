import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

type RouteContext = { params: Promise<{ runId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { runId } = await params;
  if (!/^[a-zA-Z0-9._-]+$/.test(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
  try {
    const filePath = path.join(process.cwd(), process.env.EVAL_REPORT_DIR || 'data/eval/reports', `${runId}.json`);
    const body = await readFile(filePath, 'utf8');
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${runId}.json"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
}
