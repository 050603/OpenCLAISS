import { NextResponse } from 'next/server';
import { evaluateCourse } from '@/lib/evaluation/evaluate-course';
import { createCourseGenerationInputFromOpenMAICResult } from '@/lib/evaluation/openmaic-adapter';
import { isValidClassroomJobId, readClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { readClassroom } from '@/lib/server/classroom-storage';

type RouteContext = { params: Promise<{ jobId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { jobId } = await params;
  if (!isValidClassroomJobId(jobId)) return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });

  const job = await readClassroomGenerationJob(jobId);
  if (!job) return NextResponse.json({ error: 'Classroom generation job not found' }, { status: 404 });
  if (job.status !== 'succeeded' || !job.result) {
    return NextResponse.json({ error: 'Classroom generation job is not completed or has no result' }, { status: 400 });
  }

  const classroom = await readClassroom(job.result.classroomId);
  if (!classroom) return NextResponse.json({ error: 'Persisted classroom result not found' }, { status: 400 });

  const input = createCourseGenerationInputFromOpenMAICResult({
    jobId,
    requirement: job.inputSummary.requirement || job.inputSummary.requirementPreview || '',
    result: classroom,
  });
  const report = await evaluateCourse(input);

  return NextResponse.json({
    runId: report.runId,
    topic: report.topic,
    sourceSystem: report.sourceSystem,
    overallScore: report.overallScore,
    reportUrl: `/eval/runs/${report.runId}`,
    reportJsonUrl: `/api/eval/reports/${report.runId}`,
  });
}
