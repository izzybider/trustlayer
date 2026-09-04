import type { RiskLevel } from "@/lib/schemas";

/**
 * Centralised product policy. Everything that decides how much autonomy the
 * system takes lives in this file — the rule engine reads it, the demo and the
 * benchmark both pass it through, and nothing else hard-codes a threshold.
 */

export type PolicyProfile = "conservative" | "balanced" | "autonomous";
export type AuthorizationStrictness = "strict" | "standard" | "lenient";

export type PolicyConfig = {
  profile: PolicyProfile;
  label: string;
  summary: string;
  /** Risk at or above this level is escalation-eligible when anything is unresolved. */
  escalate_at_risk: RiskLevel;
  /** Side-effecting tasks at or above this risk must gather evidence before acting. */
  verify_at_risk: RiskLevel;
  /** Classifier confidence required before the system answers or acts on its own. */
  min_confidence_for_autonomy: number;
  /** How hard the system insists on an explicit authorization check. */
  authorization_strictness: AuthorizationStrictness;
  /** Whether a partially-evidenced request may still be answered. */
  allow_answer_with_partial_evidence: boolean;
  /** Whether irreversible high-risk work always goes to a human. */
  irreversible_requires_human: boolean;
};

export const POLICY_PROFILES: Record<PolicyProfile, PolicyConfig> = {
  conservative: {
    profile: "conservative",
    label: "Conservative",
    summary:
      "Verifies early, answers only on low-risk fully-evidenced requests, hands off whenever authorization or evidence is unsettled.",
    escalate_at_risk: "medium",
    verify_at_risk: "low",
    min_confidence_for_autonomy: 0.85,
    authorization_strictness: "strict",
    allow_answer_with_partial_evidence: false,
    irreversible_requires_human: true,
  },
  balanced: {
    profile: "balanced",
    label: "Balanced",
    summary:
      "Default profile. Asks when the user can close the gap, verifies when a system of record can, escalates on high risk or unresolved ambiguity.",
    escalate_at_risk: "high",
    verify_at_risk: "medium",
    min_confidence_for_autonomy: 0.6,
    authorization_strictness: "standard",
    allow_answer_with_partial_evidence: false,
    irreversible_requires_human: true,
  },
  autonomous: {
    profile: "autonomous",
    label: "Autonomous",
    summary:
      "Maximises task completion. Answers on partial evidence, only verifies high-risk actions, escalates rarely.",
    escalate_at_risk: "high",
    verify_at_risk: "high",
    min_confidence_for_autonomy: 0.4,
    authorization_strictness: "lenient",
    allow_answer_with_partial_evidence: true,
    irreversible_requires_human: false,
  },
};

export const DEFAULT_POLICY: PolicyConfig = POLICY_PROFILES.balanced;

export const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

/** Task types that change state in the world rather than only producing text. */
export const SIDE_EFFECTING_TASKS = new Set([
  "reservation_action",
  "refund_request",
  "account_action",
  "access_control",
  "support_action",
  "healthcare_operations",
]);

export const ESCALATION_CATEGORIES: Record<string, string> = {
  healthcare: "Licensed clinician review",
  legal: "Qualified legal review",
  finance: "Licensed financial review",
  identity: "Account security desk",
  commerce: "Payments operations",
  support: "Senior support review",
  analytics: "Data team review",
  general: "Human reviewer",
};

export function isPolicyProfile(value: unknown): value is PolicyProfile {
  return value === "conservative" || value === "balanced" || value === "autonomous";
}

export function resolvePolicy(input?: unknown): PolicyConfig {
  if (isPolicyProfile(input)) return POLICY_PROFILES[input];
  if (input && typeof input === "object") {
    const candidate = input as Partial<PolicyConfig>;
    const base = isPolicyProfile(candidate.profile)
      ? POLICY_PROFILES[candidate.profile]
      : DEFAULT_POLICY;
    return {
      ...base,
      escalate_at_risk: candidate.escalate_at_risk ?? base.escalate_at_risk,
      verify_at_risk: candidate.verify_at_risk ?? base.verify_at_risk,
      min_confidence_for_autonomy:
        typeof candidate.min_confidence_for_autonomy === "number"
          ? Math.min(1, Math.max(0, candidate.min_confidence_for_autonomy))
          : base.min_confidence_for_autonomy,
      authorization_strictness:
        candidate.authorization_strictness ?? base.authorization_strictness,
      allow_answer_with_partial_evidence:
        candidate.allow_answer_with_partial_evidence ?? base.allow_answer_with_partial_evidence,
      irreversible_requires_human:
        candidate.irreversible_requires_human ?? base.irreversible_requires_human,
      label: base.label,
      summary: base.summary,
      profile: base.profile,
    };
  }
  return DEFAULT_POLICY;
}

/** True when the config no longer matches its named profile. */
export function isCustomised(config: PolicyConfig): boolean {
  const base = POLICY_PROFILES[config.profile];
  return (
    base.escalate_at_risk !== config.escalate_at_risk ||
    base.verify_at_risk !== config.verify_at_risk ||
    base.min_confidence_for_autonomy !== config.min_confidence_for_autonomy ||
    base.authorization_strictness !== config.authorization_strictness ||
    base.allow_answer_with_partial_evidence !== config.allow_answer_with_partial_evidence ||
    base.irreversible_requires_human !== config.irreversible_requires_human
  );
}

export function policyLabel(config: PolicyConfig): string {
  return isCustomised(config) ? `${config.label} (modified)` : config.label;
}
