import type {
  DecisionFactor,
  PolicyDecision,
  StructuredState,
  ToolResult,
} from "@/lib/schemas";
import {
  ESCALATION_CATEGORIES,
  RISK_RANK,
  SIDE_EFFECTING_TASKS,
  type PolicyConfig,
} from "./config";

/**
 * The TrustLayer decision engine.
 *
 * Deterministic, ordered rules over structured state. The model contributes
 * *classification* (what kind of task, how risky, what is missing); it never
 * chooses the behaviour. Every branch is inspectable and every decision carries
 * the rule id that produced it, so the same state always yields the same
 * behaviour for a given policy configuration.
 */

type Rule = {
  id: string;
  title: string;
  test: (s: StructuredState, c: PolicyConfig, ctx: EvalContext) => Omit<
    PolicyDecision,
    | "rule_id"
    | "risk_level"
    | "evidence_status"
    | "authorization_status"
    | "reversibility"
    | "information_gap"
    | "missing_information"
    | "factors"
  > | null;
};

type EvalContext = {
  /** True on the second pass, after tools have run. Stops verification loops. */
  postVerification: boolean;
};

const atLeast = (value: keyof typeof RISK_RANK, threshold: keyof typeof RISK_RANK) =>
  RISK_RANK[value] >= RISK_RANK[threshold];

const escalationCategory = (s: StructuredState) =>
  ESCALATION_CATEGORIES[s.domain] ?? ESCALATION_CATEGORIES.general;

const RULES: Rule[] = [
  {
    id: "R1_professional_judgment",
    title: "Professional judgment required",
    test: (s) =>
      s.requires_professional_judgment
        ? {
            decision: "ESCALATE",
            reason:
              "The request asks for a judgment that a licensed professional owns. No amount of retrieved evidence makes it appropriate for the assistant to decide.",
            next_step: `Route to ${escalationCategory(s).toLowerCase()} with the request and any operational context already gathered.`,
            confidence: 0.95,
            escalation_category: escalationCategory(s),
          }
        : null,
  },
  {
    id: "R2_irreversible_high_risk",
    title: "Irreversible and high risk",
    test: (s, c) =>
      c.irreversible_requires_human &&
      s.reversible === "irreversible" &&
      atLeast(s.risk_level, "high")
        ? {
            decision: "ESCALATE",
            reason:
              "The action is irreversible at high risk, so an incorrect decision cannot be undone by a follow-up correction.",
            next_step: `Hand off to ${escalationCategory(s).toLowerCase()} for explicit approval before anything is executed.`,
            confidence: 0.92,
            escalation_category: escalationCategory(s),
          }
        : null,
  },
  {
    id: "R3_unresolved_ambiguity",
    title: "Consequential ambiguity",
    test: (s, c) =>
      s.information_gap === "unresolved" && atLeast(s.risk_level, c.escalate_at_risk)
        ? {
            decision: "ESCALATE",
            reason:
              "Material ambiguity remains and it cannot be closed by asking the user or by querying a system of record.",
            next_step: `Summarise what is known and what is missing, then hand off to ${escalationCategory(
              s,
            ).toLowerCase()}.`,
            confidence: 0.82,
            escalation_category: escalationCategory(s),
          }
        : null,
  },
  {
    id: "R4_ask_user",
    title: "User can close the gap",
    test: (s) =>
      s.information_gap === "resolvable_by_user" && s.evidence_status !== "sufficient"
        ? {
            decision: "ASK",
            reason:
              "A specific piece of information is missing and the user is the fastest reliable source for it.",
            next_step: `Ask the user for ${
              s.missing_information[0] ?? "the missing detail"
            } before doing anything else.`,
            confidence: 0.9,
          }
        : null,
  },
  {
    id: "R5_authorization_unobtainable",
    title: "Authorization cannot be established",
    test: (s) =>
      s.authorization_required && s.authorization_status === "missing" && !s.tool_available
        ? {
            decision: "ESCALATE",
            reason:
              "The action requires authorization and there is no system of record available to establish it.",
            next_step: `Route to ${escalationCategory(s).toLowerCase()} to confirm permission through an authorized channel.`,
            confidence: 0.88,
            escalation_category: escalationCategory(s),
          }
        : null,
  },
  {
    id: "R6_verify_evidence",
    title: "Evidence retrievable from a system of record",
    test: (s, _c, ctx) =>
      !ctx.postVerification &&
      s.tool_available &&
      s.evidence_status !== "sufficient" &&
      s.information_gap === "resolvable_by_verification"
        ? {
            decision: "VERIFY",
            reason:
              "The claim underlying the request has to be checked against a system of record before an answer or an action is supportable.",
            next_step: "Query the system of record, then re-evaluate with the retrieved evidence.",
            confidence: 0.91,
          }
        : null,
  },
  {
    id: "R7_verify_authorization",
    title: "Authorization needs confirming",
    test: (s, c, ctx) =>
      !ctx.postVerification &&
      s.authorization_required &&
      s.authorization_status !== "present" &&
      s.tool_available &&
      c.authorization_strictness !== "lenient"
        ? {
            decision: "VERIFY",
            reason:
              "The action is permission-sensitive and the acting role's authorization has not been confirmed.",
            next_step: "Check the permission service, then re-evaluate.",
            confidence: 0.89,
          }
        : null,
  },
  {
    id: "R8_verify_risky_action",
    title: "Risky side-effecting action",
    test: (s, c, ctx) =>
      !ctx.postVerification &&
      s.tool_available &&
      SIDE_EFFECTING_TASKS.has(s.task_type) &&
      atLeast(s.risk_level, c.verify_at_risk)
        ? {
            decision: "VERIFY",
            reason:
              "The request would change state in a connected system, and the policy requires supporting evidence at this risk level before acting.",
            next_step: "Retrieve the supporting record, then re-evaluate before executing.",
            confidence: 0.85,
          }
        : null,
  },
  {
    id: "R9_low_confidence",
    title: "Classification confidence below autonomy threshold",
    test: (s, c) => {
      if (s.classification_confidence >= c.min_confidence_for_autonomy) return null;
      if (!atLeast(s.risk_level, c.escalate_at_risk)) {
        return {
          decision: "ASK",
          reason: `The request was classified with ${(s.classification_confidence * 100).toFixed(
            0,
          )}% confidence, below the ${(c.min_confidence_for_autonomy * 100).toFixed(
            0,
          )}% needed to act unaided.`,
          next_step: "Ask the user to restate what they want so the task can be classified reliably.",
          confidence: 1 - s.classification_confidence,
        };
      }
      return {
        decision: "ESCALATE",
        reason: `The request is ${s.risk_level} risk and was classified with only ${(
          s.classification_confidence * 100
        ).toFixed(0)}% confidence.`,
        next_step: `Hand off to ${escalationCategory(s).toLowerCase()} rather than acting on an uncertain classification.`,
        confidence: 1 - s.classification_confidence,
        escalation_category: escalationCategory(s),
      };
    },
  },
  {
    id: "R10_answer",
    title: "Supported answer",
    test: (s, c) => {
      const evidenceOk =
        s.evidence_status === "sufficient" ||
        (c.allow_answer_with_partial_evidence && s.evidence_status === "partially_sufficient");
      const authOk = !s.authorization_required || s.authorization_status === "present";
      const riskOk = !atLeast(s.risk_level, c.escalate_at_risk);
      if (!evidenceOk || !authOk || !riskOk) return null;
      return {
        decision: "ANSWER",
        reason:
          "Risk is within the autonomous band, the supplied evidence covers the request, and no outstanding authorization is required.",
        next_step: "Answer directly from the supplied evidence and cite what it was based on.",
        confidence: Math.min(0.95, 0.6 + s.classification_confidence * 0.35),
      };
    },
  },
  {
    id: "R11_fallback",
    title: "Fallback",
    test: (s, c, ctx) => {
      if (!ctx.postVerification && s.tool_available && s.evidence_status !== "sufficient") {
        return {
          decision: "VERIFY",
          reason:
            "The request cannot be answered from what is currently known, but a system of record can supply the missing evidence.",
          next_step: "Retrieve the supporting record, then re-evaluate.",
          confidence: 0.7,
        };
      }
      if (s.missing_information.length > 0) {
        return {
          decision: "ASK",
          reason:
            "Required detail is still missing and no system of record can supply it, so the user is asked directly.",
          next_step: `Ask the user for ${s.missing_information[0]}.`,
          confidence: 0.7,
        };
      }
      if (atLeast(s.risk_level, c.escalate_at_risk)) {
        return {
          decision: "ESCALATE",
          reason: `Risk is ${s.risk_level}, at or above this policy's escalation threshold, and nothing further can be resolved automatically.`,
          next_step: `Hand off to ${escalationCategory(s).toLowerCase()}.`,
          confidence: 0.7,
          escalation_category: escalationCategory(s),
        };
      }
      return {
        decision: "ANSWER",
        reason: "No blocking factor remains: risk is inside the autonomous band and nothing is outstanding.",
        next_step: "Answer directly and state the basis for the answer.",
        confidence: 0.65,
      };
    },
  },
];

export function buildFactors(state: StructuredState, config: PolicyConfig): DecisionFactor[] {
  const factors: DecisionFactor[] = [
    {
      label: "Task type",
      value: state.task_type.replace(/_/g, " "),
      weight: "neutral",
    },
    {
      label: "Risk",
      value: state.risk_level,
      weight: atLeast(state.risk_level, config.escalate_at_risk) ? "blocking" : "supporting",
    },
    {
      label: "Evidence",
      value: state.evidence_status.replace(/_/g, " "),
      weight: state.evidence_status === "sufficient" ? "supporting" : "blocking",
    },
    {
      label: "Authorization",
      value: state.authorization_status.replace(/_/g, " "),
      weight:
        state.authorization_required && state.authorization_status !== "present"
          ? "blocking"
          : "supporting",
    },
    {
      label: "Reversibility",
      value: state.reversible.replace(/_/g, " "),
      weight: state.reversible === "irreversible" ? "blocking" : "supporting",
    },
    {
      label: "Information gap",
      value: state.information_gap.replace(/_/g, " "),
      weight: state.information_gap === "none" ? "supporting" : "blocking",
    },
    {
      label: "Tool available",
      value: state.tool_available ? "yes" : "no",
      weight: "neutral",
    },
    {
      label: "Classification confidence",
      value: `${(state.classification_confidence * 100).toFixed(0)}% (threshold ${(
        config.min_confidence_for_autonomy * 100
      ).toFixed(0)}%)`,
      weight:
        state.classification_confidence >= config.min_confidence_for_autonomy
          ? "supporting"
          : "blocking",
    },
  ];
  if (state.requires_professional_judgment) {
    factors.unshift({
      label: "Professional judgment",
      value: "required",
      weight: "blocking",
    });
  }
  return factors;
}

export function decide(
  state: StructuredState,
  config: PolicyConfig,
  ctx: EvalContext = { postVerification: false },
): PolicyDecision {
  const factors = buildFactors(state, config);
  for (const rule of RULES) {
    const outcome = rule.test(state, config, ctx);
    if (outcome) {
      return {
        ...outcome,
        rule_id: rule.id,
        risk_level: state.risk_level,
        evidence_status: state.evidence_status,
        authorization_status: state.authorization_status,
        reversibility: state.reversible,
        information_gap: state.information_gap,
        missing_information: state.missing_information,
        factors,
      };
    }
  }
  /* Unreachable: R11 always returns. Kept so the function is total. */
  return {
    decision: "ESCALATE",
    rule_id: "R0_no_rule_matched",
    risk_level: state.risk_level,
    evidence_status: state.evidence_status,
    authorization_status: state.authorization_status,
    reversibility: state.reversible,
    information_gap: state.information_gap,
    missing_information: state.missing_information,
    reason: "No policy rule matched this state, so the request is handed to a human by default.",
    next_step: "Route to a human reviewer and add a rule for this state.",
    confidence: 0.5,
    factors,
    escalation_category: escalationCategory(state),
  };
}

export const RULE_INDEX = RULES.map((r) => ({ id: r.id, title: r.title }));

/**
 * Folds tool results back into structured state. This is the "updated system
 * state" step in the trace: evidence that was missing may now be present,
 * authorization may now be confirmed or explicitly denied, and a failed lookup
 * moves the information gap rather than silently leaving it satisfied.
 */
export function applyToolResults(
  state: StructuredState,
  results: ToolResult[],
): { state: StructuredState; notes: string[] } {
  const notes: string[] = [];
  const next: StructuredState = {
    ...state,
    available_evidence: [...state.available_evidence],
    missing_information: [...state.missing_information],
  };

  const authResults = results.filter((r) => r.tool === "checkAuthorization");
  const evidenceResults = results.filter((r) => r.tool !== "checkAuthorization");

  for (const r of evidenceResults) {
    if (r.status === "ok") {
      next.available_evidence.push(`${r.tool}: ${r.summary}`);
      const data = r.data as { ambiguous?: boolean } | undefined;
      if (data?.ambiguous) {
        next.evidence_status = "partially_sufficient";
        next.information_gap = "resolvable_by_user";
        next.missing_information = ["which specific record the request refers to"];
        notes.push("Lookup returned multiple candidate records; the user must disambiguate.");
      } else {
        next.evidence_status = "sufficient";
        next.information_gap = "none";
        next.missing_information = [];
        notes.push(`Evidence retrieved from ${r.tool}.`);
      }
    } else if (r.status === "not_found") {
      next.evidence_status = "insufficient";
      next.information_gap = "resolvable_by_user";
      /* The identifier is now the blocker, whatever was missing before. */
      next.missing_information = ["a valid record identifier (the one supplied did not resolve)"];
      next.tool_available = false;
      notes.push(`${r.tool} returned no matching record; the user must supply a valid identifier.`);
    } else {
      next.evidence_status = "insufficient";
      next.information_gap = "unresolved";
      next.tool_available = false;
      notes.push(`${r.tool} failed: ${r.summary}`);
    }
  }

  for (const r of authResults) {
    if (r.status === "ok") {
      const data = r.data as { requires_owner_approval?: boolean } | undefined;
      if (data?.requires_owner_approval) {
        next.authorization_status = "missing";
        next.tool_available = false;
        next.missing_information = [
          ...next.missing_information.filter((m) => m !== "current owner approval"),
          "current owner approval",
        ];
        notes.push("Role is permitted, but the current owner has not approved the change.");
      } else {
        next.authorization_status = "present";
        next.available_evidence.push(`checkAuthorization: ${r.summary}`);
        notes.push("Authorization confirmed by the permission service.");
      }
    } else if (r.status === "denied") {
      next.authorization_status = "missing";
      next.tool_available = false;
      notes.push(`Authorization denied: ${r.summary}`);
    } else {
      next.authorization_status = "missing";
      next.tool_available = false;
      next.information_gap = "unresolved";
      notes.push(`Authorization could not be checked: ${r.summary}`);
    }
  }

  return { state: next, notes };
}
