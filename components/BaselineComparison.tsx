"use client";

import { DecisionBadge } from "./DecisionBadge";
import { SYSTEM_SHORT_LABELS } from "@/lib/evaluation/harness";
import type { Run, SystemVariant } from "@/lib/schemas";

const ORDER: SystemVariant[] = ["direct_llm", "rag_agent", "trustlayer"];

const EVIDENCE_LABELS: Record<string, string> = {
  sufficient: "Sufficient",
  insufficient: "Insufficient",
  unavailable: "Unavailable",
  unknown: "Unknown",
};

function retrievalLabel(run: Run) {
  const lookups = run.tool_calls.filter((c) => c.tool !== "checkAuthorization");
  if (lookups.length > 0) return `${lookups.length} record lookup${lookups.length > 1 ? "s" : ""}`;
  if (run.final.grounded_in.length > 0) return "Policy documents only";
  return "None";
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

/**
 * The same request through all three designs. Every cell is read out of that
 * system's own run — this is a behavioral comparison on one scenario, not a
 * performance claim.
 */
export function BaselineComparison({ runs }: { runs: Partial<Record<SystemVariant, Run>> }) {
  const present = ORDER.filter((system) => runs[system]);
  if (present.length === 0) return null;

  const rows: { label: string; render: (run: Run) => React.ReactNode }[] = [
    {
      label: "Evidence retrieval",
      render: (run) => retrievalLabel(run),
    },
    {
      label: "Chosen behavior",
      render: (run) =>
        run.decision.decision === run.final.behavior ? (
          <DecisionBadge behavior={run.final.behavior} size="sm" />
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1">
            <DecisionBadge behavior={run.decision.decision} size="sm" />
            <span aria-hidden className="text-[10px] text-muted">
              →
            </span>
            <DecisionBadge behavior={run.final.behavior} size="sm" />
          </span>
        ),
    },
    {
      label: "Evidence at decision time",
      render: (run) =>
        EVIDENCE_LABELS[run.updated_state?.evidence_status ?? run.state.evidence_status] ?? "—",
    },
    {
      label: "Authorization checked",
      render: (run) => yesNo(run.tool_calls.some((c) => c.tool === "checkAuthorization")),
    },
    {
      label: "Produced an answer or action",
      render: (run) => yesNo(run.final.behavior === "ANSWER"),
    },
    {
      label: "Outcome",
      render: (run) => <span className="text-ink-soft">{run.final.headline}</span>,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
        <caption className="sr-only">
          Behavior of three system designs on the same request
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted">
              &nbsp;
            </th>
            {present.map((system) => (
              <th
                key={system}
                scope="col"
                className={`px-3 py-2 text-left font-medium ${
                  system === "trustlayer" ? "bg-accent-soft text-ink" : "text-ink"
                }`}
              >
                {SYSTEM_SHORT_LABELS[system]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line/70 last:border-b-0">
              <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                {row.label}
              </th>
              {present.map((system) => (
                <td
                  key={system}
                  className={`px-3 py-2 align-top ${
                    system === "trustlayer" ? "bg-accent-soft/50" : ""
                  }`}
                >
                  {row.render(runs[system] as Run)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
