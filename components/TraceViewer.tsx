"use client";

import { JsonPanel } from "./ui";
import { formatMs } from "@/lib/format";
import type { Run, TraceEvent } from "@/lib/schemas";

const STEP_LABELS: Record<TraceEvent["step"], string> = {
  user_request: "User request",
  task_classification: "Task classification",
  risk_assessment: "Risk assessment",
  evidence_assessment: "Evidence assessment",
  authorization_requirement: "Authorization requirement",
  decision: "Decision",
  tool_call: "Tool call",
  tool_result: "Tool result",
  state_update: "Updated system state",
  final_behavior: "Final behavior",
  outcome: "Outcome",
  error: "Error",
};

const DOT: Record<TraceEvent["status"], string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  fail: "bg-danger",
};

export function TraceViewer({ run }: { run: Run }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Trace</div>
          <h3 className="mt-0.5 text-[14px]">How this decision was reached</h3>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted">
          <span className="tabular">{formatMs(run.latency_ms)}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{run.id}</span>
        </div>
      </div>

      <ol className="p-4">
        {run.trace.map((event, i) => (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[event.status]}`} />
              {i < run.trace.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="eyebrow">{STEP_LABELS[event.step]}</span>
                <span className="tabular text-[10.5px] text-muted">+{formatMs(event.at_ms)}</span>
              </div>
              <div className="mt-0.5 text-[13px] font-medium text-ink">{event.title}</div>
              <p className="mt-0.5 break-words text-[12.5px] leading-relaxed text-ink-soft">
                {event.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-line p-4">
        <JsonPanel label="Developer panel — raw structured trace" value={run} />
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
          The trace records structured product state and tool I/O only. Model chain-of-thought is
          never requested, stored or displayed.
        </p>
      </div>
    </section>
  );
}
