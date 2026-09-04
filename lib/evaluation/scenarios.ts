import raw from "@/data/scenarios.json";
import { ScenarioSchema, type Scenario, type ScenarioCategory } from "@/lib/schemas";

/** Fixtures are validated once at import so a malformed scenario fails loudly. */
export const SCENARIOS: Scenario[] = ScenarioSchema.array().parse(raw);

export const FEATURED_SCENARIOS = SCENARIOS.filter((s) => s.featured);

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  "low-risk-knowledge": "Low-risk knowledge",
  "ambiguous-request": "Ambiguous request",
  "missing-information": "Missing information",
  "evidence-dependent": "Evidence dependent",
  "account-action": "Account action",
  "authorization-sensitive": "Authorization sensitive",
  "high-risk-irreversible": "High risk / irreversible",
  "analytics-root-cause": "Analytics / root cause",
  "customer-support": "Customer support",
  "healthcare-operations": "Healthcare operations (synthetic)",
};

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
