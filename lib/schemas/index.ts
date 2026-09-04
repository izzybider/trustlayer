import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Core enumerations
 * ------------------------------------------------------------------ */

export const BehaviorSchema = z.enum(["ANSWER", "ASK", "VERIFY", "ESCALATE"]);
export type Behavior = z.infer<typeof BehaviorSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const EvidenceStatusSchema = z.enum([
  "sufficient",
  "partially_sufficient",
  "insufficient",
]);
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;

export const AuthorizationStatusSchema = z.enum([
  "not_required",
  "present",
  "missing",
]);
export type AuthorizationStatus = z.infer<typeof AuthorizationStatusSchema>;

export const ReversibilitySchema = z.enum([
  "reversible",
  "partially_reversible",
  "irreversible",
]);
export type Reversibility = z.infer<typeof ReversibilitySchema>;

export const InformationGapSchema = z.enum([
  "none",
  "resolvable_by_user",
  "resolvable_by_verification",
  "unresolved",
]);
export type InformationGap = z.infer<typeof InformationGapSchema>;

export const TaskTypeSchema = z.enum([
  "informational",
  "analysis",
  "reservation_action",
  "refund_request",
  "account_action",
  "access_control",
  "clinical_judgment",
  "healthcare_operations",
  "legal_judgment",
  "financial_advice",
  "support_action",
  "other",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const DomainSchema = z.enum([
  "general",
  "commerce",
  "support",
  "analytics",
  "identity",
  "healthcare",
  "finance",
  "legal",
]);
export type Domain = z.infer<typeof DomainSchema>;

/* ------------------------------------------------------------------ *
 * Structured state
 * ------------------------------------------------------------------ */

/**
 * Context that comes from the *system of record*, not from the model.
 * In a real deployment these fields would be populated by the host
 * application (CRM, ticketing system, auth service). Here they ship with
 * the scenario fixtures.
 */
export const ScenarioContextSchema = z.object({
  task_type: TaskTypeSchema.optional(),
  domain: DomainSchema.optional(),
  available_evidence: z.array(z.string()).default([]),
  missing_information: z.array(z.string()).default([]),
  risk_level: RiskLevelSchema.optional(),
  authorization_required: z.boolean().optional(),
  authorization_present: z.boolean().optional(),
  reversible: ReversibilitySchema.optional(),
  tool_available: z.boolean().optional(),
  tool_hint: z.string().optional(),
  tool_args: z.record(z.string()).optional(),
  actor_role: z.string().optional(),
});
export type ScenarioContext = z.infer<typeof ScenarioContextSchema>;

/** What the classifier (model or heuristic) is allowed to produce. */
export const ClassificationSchema = z.object({
  task_type: TaskTypeSchema,
  domain: DomainSchema,
  risk_level: RiskLevelSchema,
  reversible: ReversibilitySchema,
  authorization_required: z.boolean(),
  requires_professional_judgment: z.boolean(),
  missing_information: z.array(z.string()).max(6).default([]),
  information_gap: InformationGapSchema,
  evidence_status: EvidenceStatusSchema,
  rationale: z.string().max(320),
  confidence: z.number().min(0).max(1),
});
export type Classification = z.infer<typeof ClassificationSchema>;

export const ClassifierSourceSchema = z.enum(["model", "heuristic", "fixture"]);
export type ClassifierSource = z.infer<typeof ClassifierSourceSchema>;

export const StructuredStateSchema = z.object({
  user_request: z.string(),
  task_type: TaskTypeSchema,
  domain: DomainSchema,
  available_evidence: z.array(z.string()),
  missing_information: z.array(z.string()),
  risk_level: RiskLevelSchema,
  evidence_status: EvidenceStatusSchema,
  authorization_required: z.boolean(),
  authorization_status: AuthorizationStatusSchema,
  reversible: ReversibilitySchema,
  information_gap: InformationGapSchema,
  requires_professional_judgment: z.boolean(),
  tool_available: z.boolean(),
  tool_hint: z.string().optional(),
  tool_args: z.record(z.string()).optional(),
  actor_role: z.string().optional(),
  classification_confidence: z.number().min(0).max(1),
  classifier_source: ClassifierSourceSchema,
  classifier_rationale: z.string(),
});
export type StructuredState = z.infer<typeof StructuredStateSchema>;

/* ------------------------------------------------------------------ *
 * Policy decision
 * ------------------------------------------------------------------ */

/**
 * A single observable factor that contributed to the decision.
 * These are product-policy facts, never model chain-of-thought.
 */
export const DecisionFactorSchema = z.object({
  label: z.string(),
  value: z.string(),
  weight: z.enum(["blocking", "supporting", "neutral"]),
});
export type DecisionFactor = z.infer<typeof DecisionFactorSchema>;

export const PolicyDecisionSchema = z.object({
  decision: BehaviorSchema,
  rule_id: z.string(),
  risk_level: RiskLevelSchema,
  evidence_status: EvidenceStatusSchema,
  authorization_status: AuthorizationStatusSchema,
  reversibility: ReversibilitySchema,
  information_gap: InformationGapSchema,
  missing_information: z.array(z.string()),
  reason: z.string(),
  next_step: z.string(),
  confidence: z.number().min(0).max(1),
  factors: z.array(DecisionFactorSchema),
  escalation_category: z.string().optional(),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

/* ------------------------------------------------------------------ *
 * Tools
 * ------------------------------------------------------------------ */

export const ToolNameSchema = z.enum([
  "lookupTransaction",
  "lookupAccount",
  "lookupReservation",
  "getProductMetrics",
  "checkAuthorization",
  "lookupPatientRecord",
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  tool: ToolNameSchema,
  args: z.record(z.string()),
  label: z.string(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const ToolResultSchema = z.object({
  call_id: z.string(),
  tool: ToolNameSchema,
  status: z.enum(["ok", "not_found", "error", "denied"]),
  summary: z.string(),
  data: z.unknown().optional(),
  latency_ms: z.number(),
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

/* ------------------------------------------------------------------ *
 * Trace
 * ------------------------------------------------------------------ */

export const TraceStepSchema = z.enum([
  "user_request",
  "task_classification",
  "risk_assessment",
  "evidence_assessment",
  "authorization_requirement",
  "decision",
  "tool_call",
  "tool_result",
  "state_update",
  "final_behavior",
  "outcome",
  "error",
]);
export type TraceStep = z.infer<typeof TraceStepSchema>;

export const TraceEventSchema = z.object({
  id: z.string(),
  step: TraceStepSchema,
  title: z.string(),
  detail: z.string(),
  status: z.enum(["ok", "warn", "fail"]).default("ok"),
  at_ms: z.number(),
  data: z.unknown().optional(),
});
export type TraceEvent = z.infer<typeof TraceEventSchema>;

/* ------------------------------------------------------------------ *
 * Final behavior + run
 * ------------------------------------------------------------------ */

export const FinalBehaviorSchema = z.object({
  behavior: BehaviorSchema,
  headline: z.string(),
  body: z.string(),
  bullets: z.array(z.string()).default([]),
  clarification_question: z.string().optional(),
  clarification_variant: z.enum(["A", "B"]).optional(),
  handoff_category: z.string().optional(),
  grounded_in: z.array(z.string()).default([]),
  generator: z.enum(["model", "template"]),
});
export type FinalBehavior = z.infer<typeof FinalBehaviorSchema>;

export const UsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  model: z.string(),
  estimated_cost_usd: z.number(),
});
export type Usage = z.infer<typeof UsageSchema>;

export const SystemVariantSchema = z.enum([
  "direct_llm",
  "rag_agent",
  "trustlayer",
]);
export type SystemVariant = z.infer<typeof SystemVariantSchema>;

export const RunSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  system: SystemVariantSchema,
  scenario_id: z.string().optional(),
  user_request: z.string(),
  /** State as it stood when the policy decided. */
  state: StructuredStateSchema,
  /** State after tool results were folded back in, when verification ran. */
  updated_state: StructuredStateSchema.optional(),
  decision: PolicyDecisionSchema,
  post_verification_decision: PolicyDecisionSchema.optional(),
  tool_calls: z.array(ToolCallSchema),
  tool_results: z.array(ToolResultSchema),
  final: FinalBehaviorSchema,
  trace: z.array(TraceEventSchema),
  latency_ms: z.number(),
  usage: UsageSchema.nullable(),
  mode: z.enum(["model", "deterministic"]),
  policy_profile: z.string(),
  warnings: z.array(z.string()).default([]),
});
export type Run = z.infer<typeof RunSchema>;

/* ------------------------------------------------------------------ *
 * Scenarios + evaluation
 * ------------------------------------------------------------------ */

export const ScenarioCategorySchema = z.enum([
  "low-risk-knowledge",
  "ambiguous-request",
  "missing-information",
  "evidence-dependent",
  "account-action",
  "authorization-sensitive",
  "high-risk-irreversible",
  "analytics-root-cause",
  "customer-support",
  "healthcare-operations",
]);
export type ScenarioCategory = z.infer<typeof ScenarioCategorySchema>;

export const ScenarioSchema = z.object({
  id: z.string(),
  category: ScenarioCategorySchema,
  title: z.string(),
  user_request: z.string(),
  context: ScenarioContextSchema,
  expected_behavior: BehaviorSchema,
  acceptable_behaviors: z.array(BehaviorSchema).min(1),
  risk_level: RiskLevelSchema,
  explanation: z.string(),
  featured: z.boolean().optional(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const FailureTypeSchema = z.enum([
  "wrong_answer",
  "unsupported_action",
  "should_have_asked",
  "should_have_verified",
  "missed_escalation",
  "unnecessary_escalation",
  "retrieval_failure",
  "tool_failure",
  "authorization_failure",
]);
export type FailureType = z.infer<typeof FailureTypeSchema>;

export const EvaluationResultSchema = z.object({
  scenario_id: z.string(),
  category: ScenarioCategorySchema,
  system: SystemVariantSchema,
  expected_behavior: BehaviorSchema,
  acceptable_behaviors: z.array(BehaviorSchema),
  observed_behavior: BehaviorSchema,
  behavior_match: z.boolean(),
  completed_autonomously: z.boolean(),
  unsupported_behavior: z.boolean(),
  grounded: z.boolean().nullable(),
  tool_used: z.boolean(),
  failures: z.array(FailureTypeSchema),
  latency_ms: z.number(),
  cost_usd: z.number(),
  mode: z.enum(["model", "deterministic"]),
  note: z.string(),
});
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export type SystemMetrics = {
  system: SystemVariant;
  n: number;
  behavior_match_rate: number;
  autonomous_completion_rate: number;
  unsupported_behavior_rate: number;
  missed_escalation_rate: number;
  missed_escalation_n: number;
  unnecessary_escalation_rate: number;
  unnecessary_escalation_n: number;
  clarification_success_rate: number | null;
  clarification_n: number;
  verification_success_rate: number | null;
  verification_n: number;
  groundedness_rate: number | null;
  groundedness_n: number;
  median_latency_ms: number;
  total_cost_usd: number;
  failure_counts: Record<FailureType, number>;
};

export type BenchmarkRun = {
  id: string;
  created_at: string;
  mode: "model" | "deterministic";
  policy_profile: string;
  scenario_count: number;
  systems: SystemVariant[];
  results: EvaluationResult[];
  metrics: SystemMetrics[];
};
