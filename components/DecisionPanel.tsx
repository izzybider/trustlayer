"use client";

import { DecisionBadge } from "./DecisionBadge";
import { Panel } from "./ui";
import type { Behavior, PolicyDecision } from "@/lib/schemas";

const BEHAVIORS: Behavior[] = ["ANSWER", "ASK", "VERIFY", "ESCALATE"];

export function DecisionPanel({
  decision,
  postDecision,
  policyLabel,
  onOverride,
  overridden,
  busy,
}: {
  decision: PolicyDecision;
  postDecision?: PolicyDecision;
  policyLabel: string;
  onOverride?: (behavior: Behavior) => void;
  overridden?: boolean;
  busy?: boolean;
}) {
  return (
    <Panel
      eyebrow="Step 3"
      title="TrustLayer decision"
      aside={<span className="chip">{policyLabel} policy</span>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <DecisionBadge behavior={decision.decision} size="lg" />
        <span className="tabular text-[12px] text-muted">
          confidence {(decision.confidence * 100).toFixed(0)}%
        </span>
        <span className="font-mono text-[11px] text-muted">{decision.rule_id}</span>
      </div>

      {overridden && (
        <p className="mt-3 border-l-2 border-warn bg-warn-soft/60 px-3 py-2 text-[12px] text-ink">
          Reviewer override in effect. The policy&rsquo;s own decision is quoted in the reason below.
        </p>
      )}

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink">{decision.reason}</p>

      <div className="mt-3 border-t border-line pt-3">
        <div className="eyebrow">Next step</div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{decision.next_step}</p>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="eyebrow">Why this behavior</div>
          <span className="text-[11px] text-muted">Observable factors, not hidden reasoning</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {decision.factors.map((f) => (
            <li key={f.label} className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] text-muted">{f.label}</span>
              <span className="flex items-baseline gap-2">
                <span className="kv">{f.value}</span>
                <span
                  aria-label={`${f.weight} factor`}
                  title={`${f.weight} factor`}
                  className={`inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full ${
                    f.weight === "blocking"
                      ? "bg-danger"
                      : f.weight === "supporting"
                        ? "bg-ok"
                        : "bg-line-strong"
                  }`}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>

      {postDecision && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="eyebrow">After verification</div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <DecisionBadge behavior={postDecision.decision} />
            <span className="font-mono text-[11px] text-muted">{postDecision.rule_id}</span>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{postDecision.reason}</p>
        </div>
      )}

      {onOverride && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="eyebrow">Reviewer override</div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
            Run the same request again with a different behavior forced, to see what the policy is
            preventing.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BEHAVIORS.filter((b) => b !== decision.decision).map((b) => (
              <button
                key={b}
                type="button"
                disabled={busy}
                className="btn px-2 py-1 font-mono text-[11px]"
                onClick={() => onOverride(b)}
              >
                Force {b}
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
