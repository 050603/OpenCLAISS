import { z } from 'zod';

export const SceneTypeSchema = z.enum([
  'opening',
  'explanation',
  'example',
  'interaction',
  'game',
  'quiz',
  'agent_dialogue',
  'summary',
  'other',
]);
export const DifficultySchema = z.enum(['basic', 'intermediate', 'advanced']);
export const RatingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const CourseGenerationInputSchema = z.object({
  runId: z.string().min(1),
  topic: z.string().min(1),
  targetLearner: z.string().min(1),
  lessonIndex: z.number().int().positive(),
  expectedDurationMinutes: z.number().positive(),
  sourceSystem: z.string().min(1),
  rawContent: z.string().min(1),
  createdAt: z.string().min(1),
});
export type CourseGenerationInput = z.infer<typeof CourseGenerationInputSchema>;

export const ParsedSceneSchema = z.object({
  sceneId: z.string().min(1),
  sceneIndex: z.number().int().nonnegative(),
  sceneType: SceneTypeSchema,
  speaker: z.string().default(''),
  content: z.string().min(1),
  learningObjective: z.string().default(''),
  interactionType: z.string().nullable(),
  estimatedTimeSeconds: z.number().nonnegative(),
});
export type ParsedScene = z.infer<typeof ParsedSceneSchema>;
export const ParsedScenesSchema = z.array(ParsedSceneSchema);

export const ExtractedConceptSchema = z.object({
  sceneId: z.string().min(1),
  concept: z.string().min(1),
  difficulty: DifficultySchema,
  evidence: z.string().min(1),
  isAdvancedForBeginners: z.boolean(),
  confidence: z.number().min(0).max(1),
});
export type ExtractedConcept = z.infer<typeof ExtractedConceptSchema>;
export const ExtractedConceptsSchema = z.array(ExtractedConceptSchema);

export const ScaffoldIssueSchema = z.object({
  sceneId: z.string().min(1),
  hasIssue: z.boolean(),
  severity: RatingSchema,
  issueType: z.enum([
    'advanced_concept_intrusion',
    'missing_prerequisite',
    'case_too_advanced',
    'outline_mismatch',
    'none',
  ]),
  problematicConcepts: z.array(z.string()),
  evidence: z.string(),
  reason: z.string(),
  suggestion: z.string(),
});
export type ScaffoldIssue = z.infer<typeof ScaffoldIssueSchema>;
export const ScaffoldIssuesSchema = z.array(ScaffoldIssueSchema);

export const InteractionEvaluationSchema = z.object({
  sceneId: z.string().min(1),
  isInteraction: z.boolean(),
  interactionType: z.string().nullable(),
  learningGoalAlignment: RatingSchema,
  knowledgeActionCoupling: RatingSchema,
  extraneousCognitiveLoad: RatingSchema,
  necessity: RatingSchema,
  timeValue: RatingSchema,
  hasWeakGamification: z.boolean(),
  reason: z.string(),
  suggestion: z.string(),
});
export type InteractionEvaluation = z.infer<typeof InteractionEvaluationSchema>;
export const InteractionEvaluationsSchema = z.array(InteractionEvaluationSchema);

export const EfficiencyEvaluationSchema = z.object({
  sceneId: z.string().min(1),
  estimatedTimeSeconds: z.number().nonnegative(),
  redundantUtteranceRatio: z.number().min(0).max(1),
  fillerPhrases: z.array(z.string()),
  repeatedConcepts: z.array(z.string()),
  lowValueAgentTurns: z.array(z.string()),
  efficiencyScore: z.number().min(0).max(100),
  hasEfficiencyProblem: z.boolean(),
  reason: z.string(),
  suggestion: z.string(),
});
export type EfficiencyEvaluation = z.infer<typeof EfficiencyEvaluationSchema>;
export const EfficiencyEvaluationsSchema = z.array(EfficiencyEvaluationSchema);

export const HumanReviewSchema = z.object({
  confirmed: z.boolean().optional(),
  reviewer: z.string().optional(),
  note: z.string().optional(),
  reviewedAt: z.string().optional(),
});

export const DiagnosticIssueSchema = z.object({
  id: z.string().min(1),
  sceneId: z.string().min(1),
  issueCategory: z.enum(['scaffold', 'interaction', 'efficiency']),
  issueType: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  evidence: z.string(),
  reason: z.string(),
  suggestion: z.string(),
  humanReview: HumanReviewSchema.optional(),
});
export type DiagnosticIssue = z.infer<typeof DiagnosticIssueSchema>;

export const CourseDiagnosticReportSchema = z.object({
  runId: z.string().min(1),
  topic: z.string().min(1),
  targetLearner: z.string().min(1),
  lessonIndex: z.number().int().positive(),
  expectedDurationMinutes: z.number().positive(),
  estimatedDurationMinutes: z.number().nonnegative(),
  scaffoldStabilityScore: z.number().min(0).max(100),
  interactionEffectivenessScore: z.number().min(0).max(100),
  teachingEfficiencyScore: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
  scenes: z.array(ParsedSceneSchema),
  concepts: z.array(ExtractedConceptSchema),
  scaffoldIssues: z.array(ScaffoldIssueSchema),
  interactionEvaluations: z.array(InteractionEvaluationSchema),
  efficiencyEvaluations: z.array(EfficiencyEvaluationSchema),
  issues: z.array(DiagnosticIssueSchema),
  summary: z.string(),
  createdAt: z.string().min(1),
});
export type CourseDiagnosticReport = z.infer<typeof CourseDiagnosticReportSchema>;
