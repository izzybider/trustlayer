/** Closed set of product events emitted by the app. */
export type AnalyticsEvent =
  | "scenario_started"
  | "decision_generated"
  | "clarification_requested"
  | "verification_started"
  | "verification_completed"
  | "escalation_triggered"
  | "task_completed"
  | "decision_overridden"
  | "benchmark_run"
  | "policy_changed"
  | "experiment_vote"
  | "pipeline_error";

