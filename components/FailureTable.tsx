import type { SystemMetrics, SystemVariant } from "@/lib/schemas";
import { FAILURE_LABELS, FAILURE_TYPES } from "@/lib/evaluation/metrics";
import { SYSTEM_SHORT_LABELS } from "@/lib/evaluation/harness";

export function FailureTable({
  metrics,
  systems,
}: {
  metrics: SystemMetrics[];
  systems: SystemVariant[];
}) {
  const bySystem = new Map(metrics.map((m) => [m.system, m]));
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
        <caption className="sr-only">Failure taxonomy counts per system</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted">
              Failure type
            </th>
            {systems.map((s) => (
              <th key={s} scope="col" className="px-4 py-3 text-right font-medium text-muted">
                {SYSTEM_SHORT_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FAILURE_TYPES.map((f) => (
            <tr key={f} className="border-b border-line/70 last:border-b-0">
              <th scope="row" className="px-4 py-2 text-left font-normal text-ink">
                {FAILURE_LABELS[f]}
              </th>
              {systems.map((s) => {
                const count = bySystem.get(s)?.failure_counts[f] ?? 0;
                return (
                  <td
                    key={s}
                    className={`tabular px-4 py-2 text-right ${
                      count === 0 ? "text-muted" : "text-ink"
                    }`}
                  >
                    {count}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
