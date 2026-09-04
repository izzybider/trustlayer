"use client";

import { useState } from "react";
import { DecisionBadge } from "./DecisionBadge";
import { formatMs } from "@/lib/format";
import type { Run } from "@/lib/schemas";

const EVIDENCE_LABELS: Record<string, string> = {
  sufficient: "Sufficient",
  insufficient: "Insufficient",
  unavailable: "Unavailable",
  unknown: "Unknown",
};

const AUTH_LABELS: Record<string, string> = {
  not_required: "Not required",
  missing: "Required",
  present: "Satisfied",
  denied: "Denied",
  unknown: "Unknown",
};

function label(map: Record<string, string>, value: string | undefined) {
  if (!value) return "—";
  return map[value] ?? value.replace(/_/g, " ");
}

/** Did the state actually move between the first decision and the final one? */
function transition(map: Record<string, string>, before?: string, after?: string) {
  const from = label(map, before);
  const to = label(map, after);
  if (!after || from === to) return { text: from, moved: false };
  return { text: `${from} → ${to}`, moved: true };
}

function finalStateLabel(run: Run): string {
  const behavior = run.final.behavior;
  if (behavior === "ANSWER") {
    return run.tool_results.some((r) => r.status === "ok")
      ? "Supported action"
      : "Answered from evidence";
  }
  if (behavior === "ASK") return "Awaiting clarification";
  if (behavior === "VERIFY") return "Verification incomplete";
  return "Handed to a human";
}

/**
 * The header a reviewer reads first: what the system did, on what state, and
 * whether verification moved that state. The detailed trace sits underneath.
 */
export function TraceSummary({ run }: { run: Run }) {
  const [copied, setCopied] = useState(false);

  const evidence = transition(
    EVIDENCE_LABELS,
    run.state.evidence_status,
    run.updated_state?.evidence_status,
  );
  const authorization = transition(
    AUTH_LABELS,
    run.state.authorization_status,
    run.updated_state?.authorization_status,
  );

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(run, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustlayer-trace-${run.id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel" aria-label="Decision summary">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Decision summary</div>
          <h3 className="mt-0.5 text-[14px]">{finalStateLabel(run)}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn px-2 py-1 text-[11.5px]" onClick={copyJson}>
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button type="button" className="btn px-2 py-1 text-[11.5px]" onClick={downloadJson}>
            Download
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-line/70 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        <div className="border-b border-line/70 px-4 py-3 lg:border-b-0">
          <dt className="eyebrow">Behavior</dt>
          <dd className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* When verification unlocks an action, both states are shown: the
                behavior that was chosen first is the product point. */}
            {run.decision.decision !== run.final.behavior && (
              <>
                <DecisionBadge behavior={run.decision.decision} />
                <span aria-hidden className="text-[11px] text-muted">
                  →
                </span>
              </>
            )}
            <DecisionBadge behavior={run.final.behavior} />
          </dd>
        </div>
        <div className="border-b border-line/70 px-4 py-3 lg:border-b-0">
          <dt className="eyebrow">Risk</dt>
          <dd className="mt-1.5 text-[13px] capitalize text-ink">{run.state.risk_level}</dd>
        </div>
        <div className="border-b border-line/70 px-4 py-3 lg:border-b-0">
          <dt className="eyebrow">Evidence</dt>
          <dd className={`mt-1.5 text-[13px] ${evidence.moved ? "text-ok" : "text-ink"}`}>
            {evidence.text}
          </dd>
        </div>
        <div className="border-b border-line/70 px-4 py-3 lg:border-b-0">
          <dt className="eyebrow">Authorization</dt>
          <dd className={`mt-1.5 text-[13px] ${authorization.moved ? "text-ok" : "text-ink"}`}>
            {authorization.text}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="eyebrow">Tool calls</dt>
          <dd className="tabular mt-1.5 text-[13px] text-ink">{run.tool_calls.length}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="eyebrow">Latency</dt>
          <dd className="tabular mt-1.5 text-[13px] text-ink">{formatMs(run.latency_ms)}</dd>
        </div>
      </dl>
    </section>
  );
}
