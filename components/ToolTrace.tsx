import { Panel } from "./ui";
import { formatMs } from "@/lib/format";
import type { ToolCall, ToolResult } from "@/lib/schemas";

const STATUS_STYLES: Record<ToolResult["status"], string> = {
  ok: "text-ok",
  not_found: "text-warn",
  denied: "text-danger",
  error: "text-danger",
};

export function ToolTrace({
  calls,
  results,
}: {
  calls: ToolCall[];
  results: ToolResult[];
}) {
  if (calls.length === 0) return null;
  return (
    <Panel eyebrow="Evidence" title="Tool calls" bodyClassName="p-0">
      <ul>
        {calls.map((call) => {
          const result = results.find((r) => r.call_id === call.id);
          return (
            <li key={call.id} className="border-b border-line/70 px-4 py-3 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-mono text-[12px] text-ink">
                  {call.tool}(
                  {Object.entries(call.args)
                    .map(([k, v]) => `${k}: "${v}"`)
                    .join(", ")}
                  )
                </span>
                <span className="chip">{call.label}</span>
              </div>
              {result ? (
                <div className="mt-1.5 flex items-start gap-2">
                  <span
                    className={`font-mono text-[10.5px] uppercase tracking-wider ${
                      STATUS_STYLES[result.status]
                    }`}
                  >
                    {result.status}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-ink-soft">
                    {result.summary}
                  </span>
                  <span className="tabular ml-auto shrink-0 text-[11px] text-muted">
                    {formatMs(result.latency_ms)}
                  </span>
                </div>
              ) : (
                <div className="mt-1.5 text-[12px] text-muted">No result recorded.</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
