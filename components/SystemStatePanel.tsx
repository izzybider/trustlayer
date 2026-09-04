import { Field, Panel } from "./ui";
import type { StructuredState } from "@/lib/schemas";

export function SystemStatePanel({
  state,
  updatedState,
}: {
  state: StructuredState;
  updatedState?: StructuredState;
}) {
  const changes = updatedState
    ? ([
        ["Evidence", state.evidence_status, updatedState.evidence_status],
        ["Authorization", state.authorization_status, updatedState.authorization_status],
        ["Information gap", state.information_gap, updatedState.information_gap],
      ] as const).filter(([, before, after]) => before !== after)
    : [];

  return (
    <Panel
      eyebrow="Step 2"
      title="System state at decision time"
      aside={
        <span className="chip">
          {state.classifier_source === "model" ? "model classified" : "heuristic classified"}
        </span>
      }
    >
      <Field label="Task type" value={state.task_type.replace(/_/g, " ")} />
      <Field
        label="Risk"
        value={state.risk_level}
        tone={state.risk_level === "high" ? "bad" : state.risk_level === "medium" ? "warn" : "good"}
      />
      <Field
        label="Evidence"
        value={state.evidence_status.replace(/_/g, " ")}
        tone={state.evidence_status === "sufficient" ? "good" : "warn"}
      />
      <Field
        label="Authorization"
        value={state.authorization_status.replace(/_/g, " ")}
        tone={
          !state.authorization_required
            ? "neutral"
            : state.authorization_status === "present"
              ? "good"
              : "bad"
        }
      />
      <Field
        label="Reversibility"
        value={state.reversible.replace(/_/g, " ")}
        tone={state.reversible === "irreversible" ? "bad" : "neutral"}
      />
      <Field
        label="Information gap"
        value={state.information_gap.replace(/_/g, " ")}
        tone={state.information_gap === "none" ? "good" : "warn"}
      />
      <Field label="Tool available" value={state.tool_available ? "yes" : "no"} />
      <Field
        label="Classification confidence"
        value={`${(state.classification_confidence * 100).toFixed(0)}%`}
      />
      {changes.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="eyebrow">After verification</div>
          <ul className="mt-1.5 space-y-1">
            {changes.map(([label, before, after]) => (
              <li key={label} className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] text-muted">{label}</span>
                <span className="kv text-right">
                  <span className="text-muted line-through">{before.replace(/_/g, " ")}</span>{" "}
                  <span aria-hidden>&rarr;</span>{" "}
                  <span className="text-ink">{after.replace(/_/g, " ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.missing_information.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="eyebrow">Missing</div>
          <ul className="mt-1.5 space-y-1">
            {state.missing_information.map((m) => (
              <li key={m} className="font-mono text-[11.5px] text-ink-soft">
                · {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
