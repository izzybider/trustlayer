import type { Scenario, ScenarioContext } from "@/lib/schemas";

/**
 * Two ways to feed a scenario to a system.
 *
 * system_provided: the host application supplies task type, risk, authorization
 *   requirement and known-missing fields — the situation in a real deployment,
 *   where those come from the CRM, the auth service and the ticket record. This
 *   isolates the policy layer: it measures the decision given the state.
 *
 * request_only: everything judgemental is stripped and the classifier has to
 *   infer it from the request text alone. Only capabilities the host genuinely
 *   knows are kept (what evidence was attached, which tool exists, who is
 *   acting). This measures perception plus policy together, and it is where the
 *   system's real errors show up.
 */
export type ContextMode = "system_provided" | "request_only";

export function contextFor(scenario: Scenario, mode: ContextMode): ScenarioContext {
  if (mode === "system_provided") return scenario.context;
  const {
    available_evidence,
    tool_available,
    tool_hint,
    tool_args,
    actor_role,
    authorization_present,
  } = scenario.context;
  return {
    available_evidence: available_evidence ?? [],
    missing_information: [],
    tool_available,
    tool_hint,
    tool_args,
    actor_role,
    authorization_present,
  };
}

export const CONTEXT_MODE_LABELS: Record<ContextMode, string> = {
  system_provided: "Host-supplied state",
  request_only: "Request text only",
};

export const CONTEXT_MODE_DESCRIPTIONS: Record<ContextMode, string> = {
  system_provided:
    "Task type, risk, reversibility, authorization requirement and known-missing fields come from the scenario fixture, standing in for a host application's own records. Isolates the decision layer.",
  request_only:
    "The classifier sees only the request text plus attached evidence, the tools that exist and who is acting. Every judgement — task type, risk, reversibility, whether authorization is needed, what is missing — has to be inferred. Harder, and closer to a cold inbox.",
};
