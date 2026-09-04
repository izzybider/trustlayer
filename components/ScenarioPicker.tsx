"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/schemas";
import { CATEGORY_LABELS } from "@/lib/evaluation/scenarios";

export function ScenarioPicker({
  featured,
  all,
  selectedId,
  customText,
  onSelectScenario,
  onCustomTextChange,
  onSubmitCustom,
  busy,
}: {
  featured: Scenario[];
  all: Scenario[];
  selectedId: string | null;
  customText: string;
  onSelectScenario: (scenario: Scenario) => void;
  onCustomTextChange: (value: string) => void;
  onSubmitCustom: () => void;
  busy: boolean;
}) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="panel min-w-0">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Step 1</div>
          <h3 className="mt-0.5 text-[14px]">Pick a scenario, or type your own request</h3>
        </div>
        <button
          type="button"
          className="text-[12px] text-muted underline underline-offset-4 hover:text-ink"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
        >
          {showAll ? "Hide" : `All ${all.length} scenarios`}
        </button>
      </div>

      <div className="flex min-w-0 flex-wrap gap-2 p-4">
        {featured.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={busy}
            onClick={() => onSelectScenario(s)}
            className={`btn w-full min-w-0 justify-start text-left sm:w-auto sm:max-w-[calc(50%-0.25rem)] ${
              selectedId === s.id ? "border-accent bg-accent-soft" : ""
            }`}
            aria-pressed={selectedId === s.id}
          >
            <span className="min-w-0 truncate">{s.user_request}</span>
          </button>
        ))}
      </div>

      {showAll && (
        <div className="max-h-64 overflow-y-auto border-t border-line bg-white">
          {all.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => {
                onSelectScenario(s);
                setShowAll(false);
              }}
              className={`flex w-full items-baseline justify-between gap-4 border-b border-line/70 px-4 py-2 text-left text-[12.5px] hover:bg-accent-soft ${
                selectedId === s.id ? "bg-accent-soft" : ""
              }`}
            >
              <span className="truncate text-ink">{s.user_request}</span>
              <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-wider text-muted">
                {CATEGORY_LABELS[s.category]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-line p-4">
        <label htmlFor="custom-request" className="eyebrow">
          Custom request
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="custom-request"
            type="text"
            value={customText}
            maxLength={600}
            placeholder="e.g. Cancel the invoice for the customer who emailed yesterday"
            onChange={(e) => onCustomTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customText.trim() && !busy) onSubmitCustom();
            }}
            className="w-full border border-line-strong bg-white px-3 py-2 text-[13.5px] text-ink placeholder:text-muted/70"
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={busy || customText.trim().length === 0}
            onClick={onSubmitCustom}
          >
            Run request
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-muted">
          A custom request carries no host context, so the classifier has to infer task type, risk,
          reversibility and what is missing from the text alone.
        </p>
      </div>
    </div>
  );
}
