import type { AnalyticsEvent } from "./types";

/** Documented in one place so the instrumentation surface is reviewable. */
export const EVENT_CATALOG: { name: AnalyticsEvent; when: string }[] = [
  { name: "scenario_started", when: "A preset or custom request is submitted." },
  { name: "decision_generated", when: "The policy layer returns a behavior." },
  { name: "clarification_requested", when: "The decision was ASK." },
  { name: "verification_started", when: "The decision was VERIFY and tools were planned." },
  { name: "verification_completed", when: "Tool results were folded back into state." },
  { name: "escalation_triggered", when: "The final behavior was ESCALATE." },
  { name: "task_completed", when: "The user received a finished answer." },
  { name: "decision_overridden", when: "A viewer forced a different behavior in the demo." },
  { name: "benchmark_run", when: "An evaluation run finished." },
  { name: "policy_changed", when: "A policy control was modified." },
  { name: "experiment_vote", when: "A clarification variant was preferred in the experiment." },
  { name: "pipeline_error", when: "An API or pipeline call failed." },
];
