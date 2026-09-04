import type {
  EvaluationResult,
  FailureType,
  SystemMetrics,
  SystemVariant,
} from "@/lib/schemas";

export const FAILURE_TYPES: FailureType[] = [
  "wrong_answer",
  "unsupported_action",
  "should_have_asked",
  "should_have_verified",
  "missed_escalation",
  "unnecessary_escalation",
  "retrieval_failure",
  "tool_failure",
  "authorization_failure",
];

export const FAILURE_LABELS: Record<FailureType, string> = {
  wrong_answer: "Wrong answer",
  unsupported_action: "Unsupported action",
  should_have_asked: "Should have asked",
  should_have_verified: "Should have verified",
  missed_escalation: "Missed escalation",
  unnecessary_escalation: "Unnecessary escalation",
  retrieval_failure: "Retrieval failure",
  tool_failure: "Tool failure",
  authorization_failure: "Authorization failure",
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

const ratio = (n: number, d: number) => (d === 0 ? 0 : n / d);

export function computeMetrics(
  system: SystemVariant,
  results: EvaluationResult[],
): SystemMetrics {
  const rows = results.filter((r) => r.system === system);
  const n = rows.length;

  const escalationExpected = rows.filter((r) => r.expected_behavior === "ESCALATE");
  const missedEscalations = escalationExpected.filter((r) =>
    r.failures.includes("missed_escalation"),
  );
  const escalationNotAcceptable = rows.filter((r) => !r.acceptable_behaviors.includes("ESCALATE"));
  const unnecessaryEscalations = escalationNotAcceptable.filter((r) =>
    r.failures.includes("unnecessary_escalation"),
  );

  const askExpected = rows.filter((r) => r.expected_behavior === "ASK");
  const verifyExpected = rows.filter((r) => r.expected_behavior === "VERIFY");
  const groundable = rows.filter((r) => r.grounded !== null);

  const failure_counts = Object.fromEntries(
    FAILURE_TYPES.map((f) => [f, rows.filter((r) => r.failures.includes(f)).length]),
  ) as Record<FailureType, number>;

  return {
    system,
    n,
    behavior_match_rate: ratio(rows.filter((r) => r.behavior_match).length, n),
    autonomous_completion_rate: ratio(rows.filter((r) => r.completed_autonomously).length, n),
    unsupported_behavior_rate: ratio(rows.filter((r) => r.unsupported_behavior).length, n),
    missed_escalation_rate: ratio(missedEscalations.length, escalationExpected.length),
    missed_escalation_n: escalationExpected.length,
    unnecessary_escalation_rate: ratio(unnecessaryEscalations.length, escalationNotAcceptable.length),
    unnecessary_escalation_n: escalationNotAcceptable.length,
    clarification_success_rate:
      askExpected.length === 0
        ? null
        : ratio(askExpected.filter((r) => r.observed_behavior === "ASK").length, askExpected.length),
    clarification_n: askExpected.length,
    verification_success_rate:
      verifyExpected.length === 0
        ? null
        : ratio(
            verifyExpected.filter((r) => r.observed_behavior === "VERIFY" && r.tool_used).length,
            verifyExpected.length,
          ),
    verification_n: verifyExpected.length,
    groundedness_rate:
      groundable.length === 0
        ? null
        : ratio(groundable.filter((r) => r.grounded === true).length, groundable.length),
    groundedness_n: groundable.length,
    median_latency_ms: median(rows.map((r) => r.latency_ms)),
    total_cost_usd: rows.reduce((sum, r) => sum + r.cost_usd, 0),
    failure_counts,
  };
}

export const METRIC_DEFINITIONS: { key: string; label: string; definition: string }[] = [
  {
    key: "behavior_match_rate",
    label: "Expected behavior match",
    definition:
      "Share of scenarios where the behavior the system selected is in the scenario's acceptable set.",
  },
  {
    key: "autonomous_completion_rate",
    label: "Autonomous completion",
    definition:
      "Share of scenarios where the user ends up with a finished answer or action without a human or a follow-up turn. Verifying and then answering counts as completion.",
  },
  {
    key: "unsupported_behavior_rate",
    label: "Unsupported behavior",
    definition:
      "Share of scenarios where the system produced an answer or action that the scenario label says was not supportable: the evidence, the clarification or the human judgment it required was missing.",
  },
  {
    key: "missed_escalation_rate",
    label: "Missed escalation",
    definition: "Of scenarios labelled ESCALATE, the share where the system did not escalate.",
  },
  {
    key: "unnecessary_escalation_rate",
    label: "Unnecessary escalation",
    definition:
      "Of scenarios where escalation is not in the acceptable set, the share where the system escalated anyway. This is the friction cost of the policy.",
  },
  {
    key: "clarification_success_rate",
    label: "Clarification success",
    definition: "Of scenarios labelled ASK, the share where the system asked instead of guessing.",
  },
  {
    key: "verification_success_rate",
    label: "Verification success",
    definition:
      "Of scenarios labelled VERIFY, the share where the system chose VERIFY and a tool call actually returned evidence.",
  },
  {
    key: "groundedness_rate",
    label: "Groundedness",
    definition:
      "Of the answers produced for evidence-dependent scenarios, the share that cite at least one retrieved or supplied piece of evidence.",
  },
  {
    key: "median_latency_ms",
    label: "Median latency",
    definition: "Measured wall-clock time per run inside the pipeline, median across scenarios.",
  },
  {
    key: "total_cost_usd",
    label: "Estimated cost",
    definition:
      "Token usage reported by the API multiplied by published per-token prices. Zero in deterministic mode, where no model is called.",
  },
];
