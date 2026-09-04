"use client";

import { POLICY_PROFILES, isCustomised, type PolicyConfig, type PolicyProfile } from "@/lib/policy/config";
import type { RiskLevel } from "@/lib/schemas";

const PROFILES: PolicyProfile[] = ["conservative", "balanced", "autonomous"];
const RISKS: RiskLevel[] = ["low", "medium", "high"];

export function PolicyControls({
  config,
  onChange,
  compact = false,
}: {
  config: PolicyConfig;
  onChange: (next: PolicyConfig) => void;
  compact?: boolean;
}) {
  const update = (patch: Partial<PolicyConfig>) => onChange({ ...config, ...patch });

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Policy</div>
          <h3 className="mt-0.5 text-[14px]">Autonomy configuration</h3>
        </div>
        {isCustomised(config) && <span className="chip">modified</span>}
      </div>

      <div className="p-4">
        <div
          role="radiogroup"
          aria-label="Policy profile"
          className="grid grid-cols-3 gap-1.5"
        >
          {PROFILES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={config.profile === p && !isCustomised(config)}
              onClick={() => onChange(POLICY_PROFILES[p])}
              className={`border px-2 py-2 text-[12.5px] transition-colors ${
                config.profile === p
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line-strong bg-white text-muted hover:text-ink"
              }`}
            >
              {POLICY_PROFILES[p].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">{config.summary}</p>

        {!compact && (
          <details className="mt-4 border-t border-line pt-3">
            <summary className="flex items-center justify-between text-[12.5px] text-muted hover:text-ink">
              <span>Thresholds</span>
              <span aria-hidden className="font-mono text-[11px]">
                edit
              </span>
            </summary>
            <div className="mt-4 space-y-4">
            <SelectRow
              label="Escalate at risk level"
              hint="Risk at or above this becomes escalation-eligible when anything is unresolved."
              value={config.escalate_at_risk}
              options={RISKS}
              onChange={(v) => update({ escalate_at_risk: v as RiskLevel })}
            />
            <SelectRow
              label="Verify at risk level"
              hint="Side-effecting tasks at or above this must gather evidence first."
              value={config.verify_at_risk}
              options={RISKS}
              onChange={(v) => update({ verify_at_risk: v as RiskLevel })}
            />
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="min-confidence" className="text-[12.5px] text-ink">
                  Minimum confidence for autonomy
                </label>
                <span className="tabular kv">
                  {(config.min_confidence_for_autonomy * 100).toFixed(0)}%
                </span>
              </div>
              <input
                id="min-confidence"
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(config.min_confidence_for_autonomy * 100)}
                onChange={(e) =>
                  update({ min_confidence_for_autonomy: Number(e.target.value) / 100 })
                }
                className="mt-2 w-full accent-[#3C5A78]"
              />
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                Below this classification confidence the system asks or escalates instead of acting.
              </p>
            </div>
            <SelectRow
              label="Authorization strictness"
              hint="Lenient skips the explicit permission check for permission-sensitive actions."
              value={config.authorization_strictness}
              options={["strict", "standard", "lenient"]}
              onChange={(v) =>
                update({ authorization_strictness: v as PolicyConfig["authorization_strictness"] })
              }
            />
            <ToggleRow
              label="Answer on partial evidence"
              checked={config.allow_answer_with_partial_evidence}
              onChange={(v) => update({ allow_answer_with_partial_evidence: v })}
            />
              <ToggleRow
                label="Irreversible high-risk work always goes to a human"
                checked={config.irreversible_requires_human}
                onChange={(v) => update({ irreversible_requires_human: v })}
              />
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function SelectRow({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const id = `policy-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-[12.5px] text-ink">
          {label}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border border-line-strong bg-white px-2 py-1 font-mono text-[11.5px] text-ink"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
      {hint && <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = `policy-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="text-[12.5px] leading-snug text-ink">
        {label}
      </label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#3C5A78]"
      />
    </div>
  );
}
