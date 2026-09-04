"use client";

import { useMemo, useState } from "react";
import { ComparisonTable } from "./ComparisonTable";
import { FailureTable } from "./FailureTable";
import { MetricCard } from "./MetricCard";
import { PolicyControls } from "./PolicyControls";
import { TradeoffChart } from "./TradeoffChart";
import { DecisionBadge } from "./DecisionBadge";
import { Callout, EmptyState, JsonPanel, Panel } from "./ui";
import { track } from "@/lib/analytics/events";
import { DEFAULT_POLICY, policyLabel, type PolicyConfig } from "@/lib/policy/config";
import { computeMetrics, FAILURE_LABELS, METRIC_DEFINITIONS } from "@/lib/evaluation/metrics";
import { SYSTEM_DESCRIPTIONS, SYSTEM_LABELS } from "@/lib/evaluation/harness";
import {
  CONTEXT_MODE_DESCRIPTIONS,
  CONTEXT_MODE_LABELS,
  type ContextMode,
} from "@/lib/evaluation/context";
import { CATEGORY_LABELS } from "@/lib/evaluation/scenarios";
import type { EvaluationResult, Scenario, SystemVariant } from "@/lib/schemas";

const SYSTEMS: SystemVariant[] = ["direct_llm", "rag_agent", "trustlayer"];
const BATCH_SIZE = 6;

type Status = "idle" | "running" | "error";

type RunMeta = {
  at: string;
  scenarioCount: number;
  policy: string;
  contextMode: ContextMode;
  mode: "model" | "deterministic";
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Stratified subset so a quick run still covers every category. */
function subsetOf(scenarios: Scenario[], perCategory: number): Scenario[] {
  const counts = new Map<string, number>();
  return scenarios.filter((s) => {
    const n = counts.get(s.category) ?? 0;
    if (n >= perCategory) return false;
    counts.set(s.category, n + 1);
    return true;
  });
}

export function EvaluationClient({
  scenarios,
  modelAvailable,
}: {
  scenarios: Scenario[];
  modelAvailable: boolean;
}) {
  const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [contextMode, setContextMode] = useState<ContextMode>("system_provided");
  const [useModel, setUseModel] = useState(false);
  const [quick, setQuick] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [meta, setMeta] = useState<RunMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  const selected = useMemo(
    () => (quick ? subsetOf(scenarios, 2) : scenarios),
    [quick, scenarios],
  );
  const scenarioById = useMemo(() => new Map(scenarios.map((s) => [s.id, s])), [scenarios]);

  const metrics = useMemo(
    () => (results.length ? SYSTEMS.map((s) => computeMetrics(s, results)) : []),
    [results],
  );
  const trustlayer = metrics.find((m) => m.system === "trustlayer");

  const runBenchmark = async () => {
    setStatus("running");
    setError(null);
    setNotes([]);
    setResults([]);
    const batches = chunk(
      selected.map((s) => s.id),
      BATCH_SIZE,
    );
    setProgress({ done: 0, total: batches.length * SYSTEMS.length });

    const collected: EvaluationResult[] = [];
    const collectedNotes: string[] = [];
    try {
      for (const system of SYSTEMS) {
        for (const batch of batches) {
          const response = await fetch("/api/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system,
              scenario_ids: batch,
              policy,
              context_mode: contextMode,
              use_model: useModel && modelAvailable,
            }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error ?? "Benchmark batch failed.");
          collected.push(...(payload.results as EvaluationResult[]));
          collectedNotes.push(...((payload.notes as string[]) ?? []));
          setResults([...collected]);
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }
      const mode = useModel && modelAvailable ? "model" : "deterministic";
      setMeta({
        at: new Date().toISOString(),
        scenarioCount: selected.length,
        policy: policyLabel(policy),
        contextMode,
        mode,
      });
      setNotes(Array.from(new Set(collectedNotes)).slice(0, 4));
      setStatus("idle");
      track("benchmark_run", {
        scenarios: selected.length,
        policy: policy.profile,
        context_mode: contextMode,
        mode,
      });
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
      track("pipeline_error", { where: "evaluate", message: (err as Error).message.slice(0, 80) });
    }
  };

  const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(0)}%`);
  const running = status === "running";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <PolicyControls
            config={policy}
            onChange={(next) => {
              setPolicy(next);
              track("policy_changed", { profile: next.profile, surface: "evaluation" });
            }}
          />
        </div>

        <Panel eyebrow="Run" title="Benchmark configuration">
          <div className="space-y-4">
            <fieldset>
              <legend className="eyebrow">Context given to the classifier</legend>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {(["system_provided", "request_only"] as ContextMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setContextMode(mode)}
                    aria-pressed={contextMode === mode}
                    className={`border px-3 py-2 text-left text-[12.5px] ${
                      contextMode === mode
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line-strong bg-white text-muted hover:text-ink"
                    }`}
                  >
                    {CONTEXT_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                {CONTEXT_MODE_DESCRIPTIONS[contextMode]}
              </p>
            </fieldset>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4">
              <label className="flex items-center gap-2 text-[12.5px] text-ink">
                <input
                  type="checkbox"
                  checked={quick}
                  onChange={(e) => setQuick(e.target.checked)}
                  className="h-4 w-4 accent-[#3C5A78]"
                />
                Quick run ({subsetOf(scenarios, 2).length} of {scenarios.length} scenarios)
              </label>
              <label
                className={`flex items-center gap-2 text-[12.5px] ${
                  modelAvailable ? "text-ink" : "text-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={useModel && modelAvailable}
                  disabled={!modelAvailable}
                  onChange={(e) => setUseModel(e.target.checked)}
                  className="h-4 w-4 accent-[#3C5A78]"
                />
                Use model classification
                {!modelAvailable && " (no API key configured)"}
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <button type="button" className="btn-primary" onClick={runBenchmark} disabled={running}>
                {running ? "Running…" : "Run benchmark"}
              </button>
              <span className="text-[12px] text-muted">
                {selected.length} scenarios × {SYSTEMS.length} systems ={" "}
                {selected.length * SYSTEMS.length} runs
              </span>
            </div>

            {running && (
              <div role="status" aria-live="polite">
                <div className="h-1 w-full bg-line">
                  <div
                    className="h-1 bg-accent transition-all"
                    style={{
                      width: `${
                        progress.total ? (progress.done / progress.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-[12px] text-muted">
                  Batch {progress.done} of {progress.total}. Results appear as each batch returns.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="border border-danger/40 bg-danger-soft px-3 py-2 text-[12.5px]">
                <span className="font-medium">The benchmark stopped.</span> {error} No partial
                metrics are shown, because a partial run would not be comparable.
              </div>
            )}
          </div>
        </Panel>
      </div>

      {results.length === 0 && !running && (
        <EmptyState
          title="No results yet"
          body="Nothing on this page is precomputed. Press Run benchmark and the three systems execute against the scenarios live; every number below is calculated from those runs."
        />
      )}

      {trustlayer && meta && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
            <span>
              Run at {new Date(meta.at).toLocaleTimeString()} · {meta.scenarioCount} scenarios ·{" "}
              {meta.policy} policy · {CONTEXT_MODE_LABELS[meta.contextMode]} ·{" "}
              {meta.mode === "model" ? "model classification" : "deterministic classification"}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Behavior match"
              value={pct(trustlayer.behavior_match_rate)}
              hint="TrustLayer, against the scenario labels"
              emphasis
            />
            <MetricCard
              label="Unsupported behavior"
              value={pct(trustlayer.unsupported_behavior_rate)}
              hint="answers or actions the labels say were not supportable"
              emphasis
            />
            <MetricCard
              label="Autonomous completion"
              value={pct(trustlayer.autonomous_completion_rate)}
              hint="finished without a human or a follow-up turn"
            />
            <MetricCard
              label="Unnecessary escalation"
              value={pct(trustlayer.unnecessary_escalation_rate)}
              hint="the friction this policy costs"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <TradeoffChart metrics={metrics} />
            <div className="space-y-4">
              <Callout tone="accent">
                The objective is not minimizing escalation. The objective is minimizing inappropriate
                behavior while preserving useful autonomy. A configuration that escalates everything
                scores zero unsupported behavior and is a worse product.
              </Callout>
              <Panel eyebrow="Systems" title="What is being compared">
                <ul className="space-y-2.5">
                  {SYSTEMS.map((s) => (
                    <li key={s}>
                      <div className="text-[12.5px] font-medium text-ink">{SYSTEM_LABELS[s]}</div>
                      <p className="text-[12px] leading-relaxed text-muted">
                        {SYSTEM_DESCRIPTIONS[s]}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>

          <ComparisonTable metrics={metrics} systems={SYSTEMS} />

          {notes.length > 0 && (
            <Callout>
              {notes.map((n, i) => (
                <p key={i} className={i > 0 ? "mt-1" : ""}>
                  {n}
                </p>
              ))}
            </Callout>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-[14px]">Failure taxonomy</h3>
              <FailureTable metrics={metrics} systems={SYSTEMS} />
            </div>
            <div className="space-y-2">
              <h3 className="text-[14px]">How each metric is defined</h3>
              <div className="panel divide-y divide-line/70">
                {METRIC_DEFINITIONS.map((d) => (
                  <div key={d.key} className="px-4 py-2.5">
                    <div className="text-[12.5px] text-ink">{d.label}</div>
                    <p className="text-[11.5px] leading-relaxed text-muted">{d.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <details className="panel">
            <summary className="panel-header text-[13px]">
              <div>
                <div className="eyebrow">Detail</div>
                <h3 className="mt-0.5 text-[14px]">Per-scenario results</h3>
              </div>
              <span className="chip">{results.length} rows</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="px-4 py-2 text-left font-medium">Scenario</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Category</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Expected</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Observed</th>
                    <th scope="col" className="px-4 py-2 text-left font-medium">Failures</th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .filter((r) => r.system === "trustlayer")
                    .map((r) => (
                      <tr key={`${r.system}-${r.scenario_id}`} className="border-b border-line/70">
                        <td className="px-4 py-2">
                          <span className="font-mono text-[11px] text-muted">{r.scenario_id}</span>
                          <span className="block text-ink">
                            {scenarioById.get(r.scenario_id)?.user_request}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted">{CATEGORY_LABELS[r.category]}</td>
                        <td className="px-4 py-2">
                          <DecisionBadge behavior={r.expected_behavior} size="sm" />
                        </td>
                        <td className="px-4 py-2">
                          <span className={r.behavior_match ? "text-ink" : "text-danger"}>
                            {r.note}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted">
                          {r.failures.map((f) => FAILURE_LABELS[f]).join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <JsonPanel label="Raw results for every system" value={results} />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
