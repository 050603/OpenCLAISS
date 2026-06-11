import { NextResponse } from 'next/server';
import { loadReports, reportToCsvRows } from '@/lib/evaluation/report-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const csv = reportToCsvRows(await loadReports());
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="course-evaluation-reports.csv"',
    },
  });
}
