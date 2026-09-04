"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/events";
import { clarificationText } from "@/lib/ai/clarification";
import type { StructuredState } from "@/lib/schemas";

/**
 * Explanation experiment.
 *
 * This panel is the experiment *design* plus the instrument that would collect
 * the data. No participants have been run, so no result is claimed. The tally
 * below is whatever this browser has clicked, stored locally, and it is labelled
 * as such.
 */

const STORAGE_KEY = "trustlayer_experiment_votes";

const DEMO_STATE: StructuredState = {
  user_request: "Refund this customer because they say they were charged twice.",
  task_type: "refund_request",
  domain: "commerce",
  available_evidence: [],
  missing_information: ["the account number"],
  risk_level: "medium",
  evidence_status: "insufficient",
  authorization_required: true,
  authorization_status: "missing",
  reversible: "partially_reversible",
  information_gap: "resolvable_by_user",
  requires_professional_judgment: false,
  tool_available: true,
  classification_confidence: 0.91,
  classifier_source: "fixture",
  classifier_rationale: "Fixed example used for the experiment design.",
};

type Votes = { A: number; B: number };

export function ExperimentPanel() {
  const [votes, setVotes] = useState<Votes>({ A: 0, B: 0 });
  const [voted, setVoted] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setVotes(JSON.parse(raw) as Votes);
    } catch {
      /* storage unavailable; the tally just starts at zero */
    }
  }, []);

  const vote = (variant: "A" | "B") => {
    const next = { ...votes, [variant]: votes[variant] + 1 };
    setVotes(next);
    setVoted(variant);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    track("experiment_vote", { variant });
  };

  const total = votes.A + votes.B;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Experiment design</div>
          <h3 className="mt-0.5 text-[14px]">Does explaining the reason for a question reduce drop-off?</h3>
        </div>
        <span className="chip">not yet run</span>
      </div>

      <div className="space-y-4 p-4">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          ASK is the behavior that spends the user&rsquo;s time, so its wording is a product decision,
          not a copy decision. The hypothesis is that a clarification carrying its own justification
          is answered more often than a bare request for a field.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {(["A", "B"] as const).map((variant) => (
            <div
              key={variant}
              className={`border p-3 ${
                voted === variant ? "border-accent bg-accent-soft/60" : "border-line bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow">Variant {variant}</span>
                <span className="text-[11px] text-muted">
                  {variant === "A" ? "field request" : "reason-first"}
                </span>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink">
                &ldquo;{clarificationText(DEMO_STATE, variant)}&rdquo;
              </p>
              <button
                type="button"
                className="btn mt-3 w-full"
                onClick={() => vote(variant)}
                aria-pressed={voted === variant}
              >
                I would answer this one
              </button>
            </div>
          ))}
        </div>

        <dl className="grid gap-x-6 gap-y-2 border-t border-line pt-4 text-[12.5px] sm:grid-cols-2">
          <Row term="Status" detail="Experiment design. No participants have been run." />
          <Row
            term="Primary metric"
            detail="Clarification response rate: share of ASK turns that receive the requested field."
          />
          <Row
            term="Secondary metrics"
            detail="Time to respond, abandonment after ASK, task completion within the session."
          />
          <Row
            term="Assignment"
            detail="Randomised per session at the point the policy layer selects ASK, held constant for that session."
          />
          <Row
            term="Population"
            detail="Support agents and end users who receive at least one ASK. Excludes sessions that never reach ASK."
          />
          <Row
            term="Guardrail"
            detail="Variant B must not increase time-to-resolution or reduce the accuracy of supplied fields."
          />
          <Row
            term="Why it is not run here"
            detail="There are no real participants in a synthetic demo, so reporting a number would be fabricating one."
          />
        </dl>

        <div className="border-t border-line pt-4">
          <div className="eyebrow">In-app preference tally</div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Clicks recorded in this browser only, kept in local storage. This is an instrument check,
            not a study result, and it is not evidence for or against the hypothesis.
          </p>
          <div className="mt-2 flex items-center gap-4 text-[12.5px]">
            <span className="tabular">
              A: <span className="text-ink">{votes.A}</span>
            </span>
            <span className="tabular">
              B: <span className="text-ink">{votes.B}</span>
            </span>
            <span className="tabular text-muted">n = {total}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="eyebrow">{term}</dt>
      <dd className="mt-0.5 leading-relaxed text-ink-soft">{detail}</dd>
    </div>
  );
}
