import type { SystemMetrics, SystemVariant } from "@/lib/schemas";
import { SYSTEM_SHORT_LABELS } from "@/lib/evaluation/harness";
import { formatMs } from "@/lib/format";

type Row = {
  label: string;
  hint: string;
  format: (m: SystemMetrics) => string;
  /** lower / higher is better, used only for the small directional marker. */
  better: "lower" | "higher" | "none";
  value: (m: SystemMetrics) => number | null;
};

const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(0)}%`);

const ROWS: Row[] = [
  {
    label: "Expected behavior match",
    hint: "selected behavior is in the scenario's acceptable set",
    format: (m) => pct(m.behavior_match_rate),
    value: (m) => m.behavior_match_rate,
    better: "higher",
  },
  {
    label: "Autonomous completion",
    hint: "user got a finished answer without a human or a follow-up turn",
    format: (m) => pct(m.autonomous_completion_rate),
    value: (m) => m.autonomous_completion_rate,
    better: "higher",
  },
  {
    label: "Unsupported behavior",
    hint: "answered or acted where the label says it could not be supported",
    format: (m) => pct(m.unsupported_behavior_rate),
    value: (m) => m.unsupported_behavior_rate,
    better: "lower",
  },
  {
    label: "Missed escalation",
    hint: "of scenarios labelled ESCALATE",
    format: (m) => `${pct(m.missed_escalation_rate)} of ${m.missed_escalation_n}`,
    value: (m) => m.missed_escalation_rate,
    better: "lower",
  },
  {
    label: "Unnecessary escalation",
    hint: "of scenarios where escalation is not acceptable",
    format: (m) => `${pct(m.unnecessary_escalation_rate)} of ${m.unnecessary_escalation_n}`,
    value: (m) => m.unnecessary_escalation_rate,
    better: "lower",
  },
  {
    label: "Clarification success",
    hint: "of scenarios labelled ASK",
    format: (m) => `${pct(m.clarification_success_rate)} of ${m.clarification_n}`,
    value: (m) => m.clarification_success_rate,
    better: "higher",
  },
  {
    label: "Verification success",
    hint: "of scenarios labelled VERIFY, with a tool result",
    format: (m) => `${pct(m.verification_success_rate)} of ${m.verification_n}`,
    value: (m) => m.verification_success_rate,
    better: "higher",
  },
  {
    label: "Groundedness",
    hint: "answers to evidence-dependent scenarios citing evidence",
    format: (m) => `${pct(m.groundedness_rate)} of ${m.groundedness_n}`,
    value: (m) => m.groundedness_rate,
    better: "higher",
  },
  {
    label: "Median latency",
    hint: "measured in-pipeline, per scenario",
    format: (m) => formatMs(m.median_latency_ms),
    value: () => null,
    better: "none",
  },
  {
    label: "Estimated cost",
    hint: "token usage x published prices; zero when no model is called",
    format: (m) => (m.total_cost_usd === 0 ? "$0.00" : `$${m.total_cost_usd.toFixed(4)}`),
    value: () => null,
    better: "none",
  },
];

export function ComparisonTable({
  metrics,
  systems,
}: {
  metrics: SystemMetrics[];
  systems: SystemVariant[];
}) {
  const bySystem = new Map(metrics.map((m) => [m.system, m]));

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
        <caption className="sr-only">
          Benchmark metrics for each system, computed from the runs in this session
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted">
              Metric
            </th>
            {systems.map((s) => (
              <th
                key={s}
                scope="col"
                className={`px-4 py-3 text-right font-medium ${
                  s === "trustlayer" ? "text-ink" : "text-muted"
                }`}
              >
                {SYSTEM_SHORT_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const values = systems
              .map((s) => ({ s, v: row.value(bySystem.get(s)!) }))
              .filter((x) => x.v !== null) as { s: SystemVariant; v: number }[];
            const best =
              row.better === "none" || values.length === 0
                ? null
                : values.reduce((acc, cur) =>
                    row.better === "higher" ? (cur.v > acc.v ? cur : acc) : cur.v < acc.v ? cur : acc,
                  ).s;
            return (
              <tr key={row.label} className="border-b border-line/70 last:border-b-0">
                <th scope="row" className="px-4 py-2.5 text-left font-normal">
                  <span className="text-ink">{row.label}</span>
                  <span className="block text-[11px] leading-snug text-muted">{row.hint}</span>
                </th>
                {systems.map((s) => {
                  const m = bySystem.get(s);
                  return (
                    <td
                      key={s}
                      className={`tabular px-4 py-2.5 text-right ${
                        best === s ? "text-ink" : "text-ink-soft"
                      }`}
                    >
                      {m ? row.format(m) : "—"}
                      {best === s && (
                        <span aria-label="best in this row" className="ml-1.5 text-accent">
                          ·
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
