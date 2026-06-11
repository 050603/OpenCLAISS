import { NextResponse } from 'next/server';
import { createCourseGenerationInputFromOpenMAICResult } from '@/lib/evaluation/openmaic-adapter';
import { evaluateCourse } from '@/lib/evaluation/evaluate-course';
import { isValidClassroomJobId, readClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { readClassroom } from '@/lib/server/classroom-storage';

export const dynamic = 'force-dynamic';

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
  const evaluationInput = createCourseGenerationInputFromOpenMAICResult({
    jobId,
    requirement: job.inputSummary.requirementPreview,
    result: classroom || job.result,
    sourceSystem: 'OpenMAIC',
  });
  const report = await evaluateCourse(evaluationInput);

  return NextResponse.json({
    runId: report.runId,
    overallScore: report.overallScore,
    scaffoldStabilityScore: report.scaffoldStabilityScore,
    interactionEffectivenessScore: report.interactionEffectivenessScore,
    teachingEfficiencyScore: report.teachingEfficiencyScore,
    reportUrl: `/eval/runs/${report.runId}`,
  });
}
