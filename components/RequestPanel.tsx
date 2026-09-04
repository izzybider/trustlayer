import { Panel } from "./ui";
import type { Scenario, ScenarioContext } from "@/lib/schemas";

export function RequestPanel({
  userRequest,
  context,
  scenario,
}: {
  userRequest: string;
  context: ScenarioContext | null;
  scenario: Scenario | null;
}) {
  const structured = context
    ? {
        task_type: context.task_type ?? "(inferred by classifier)",
        available_evidence: context.available_evidence ?? [],
        missing_information: context.missing_information ?? [],
        risk_level: context.risk_level ?? "(inferred)",
        authorization_required: context.authorization_required ?? "(inferred)",
        reversible: context.reversible ?? "(inferred)",
        tool_available: context.tool_available ?? false,
        actor_role: context.actor_role ?? "(none)",
      }
    : null;

  return (
    <Panel eyebrow="Input" title="User request" className="h-full">
      <blockquote className="border-l-2 border-line-strong pl-3 text-[14.5px] leading-relaxed text-ink">
        {userRequest || "No request yet."}
      </blockquote>

      {scenario && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">{scenario.explanation}</p>
      )}

      <div className="mt-4">
        <div className="eyebrow">Structured context from the host system</div>
        {structured ? (
          <pre className="mt-2 overflow-x-auto border border-line bg-paper px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-ink-soft">
            {JSON.stringify(structured, null, 2)}
          </pre>
        ) : (
          <p className="mt-2 text-[12px] text-muted">
            None. Everything below was inferred from the request text.
          </p>
        )}
      </div>
    </Panel>
  );
}
