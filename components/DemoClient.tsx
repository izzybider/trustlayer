"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScenarioPicker } from "./ScenarioPicker";
import { RequestPanel } from "./RequestPanel";
import { SystemStatePanel } from "./SystemStatePanel";
import { DecisionPanel } from "./DecisionPanel";
import { FinalBehaviorPanel } from "./FinalBehaviorPanel";
import { ToolTrace } from "./ToolTrace";
import { TraceViewer } from "./TraceViewer";
import { TraceSummary } from "./TraceSummary";
import { BaselineComparison } from "./BaselineComparison";
import { PolicyControls } from "./PolicyControls";
import { EventStream } from "./EventStream";
import { DecisionBadge } from "./DecisionBadge";
import { Callout, EmptyState, Panel } from "./ui";
import { track } from "@/lib/analytics/events";
import { DEFAULT_POLICY, policyLabel, type PolicyConfig } from "@/lib/policy/config";
import { SYSTEM_DESCRIPTIONS, SYSTEM_SHORT_LABELS } from "@/lib/evaluation/harness";
import type { Behavior, Run, Scenario, ScenarioContext, SystemVariant } from "@/lib/schemas";

type Status = "idle" | "running" | "error";

/** One canonical request per behavior, so the four outcomes are one click apart. */
const BEHAVIOR_PRESETS: { behavior: Behavior; scenarioId: string }[] = [
  { behavior: "ANSWER", scenarioId: "know_001" },
  { behavior: "ASK", scenarioId: "amb_001" },
  { behavior: "VERIFY", scenarioId: "ev_001" },
  { behavior: "ESCALATE", scenarioId: "hc_001" },
];

export function DemoClient({
  featured,
  scenarios,
  initialScenarioId,
}: {
  featured: Scenario[];
  scenarios: Scenario[];
  initialScenarioId?: string;
}) {
  const [policy, setPolicy] = useState<PolicyConfig>(DEFAULT_POLICY);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [customText, setCustomText] = useState("");
  const [submitted, setSubmitted] = useState<{
    request: string;
    context: ScenarioContext | null;
  } | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [baselines, setBaselines] = useState<Partial<Record<SystemVariant, Run>> | null>(null);
  const [baselineStatus, setBaselineStatus] = useState<Status>("idle");

  const busy = status === "running";

  const execute = useCallback(
    async (
      request: string,
      context: ScenarioContext | null,
      scenarioId: string | undefined,
      forceBehavior?: Behavior,
    ) => {
      setStatus("running");
      setError(null);
      setBaselines(null);
      setBaselineStatus("idle");
      setOverridden(Boolean(forceBehavior));
      setSubmitted({ request, context });
      track("scenario_started", {
        scenario_id: scenarioId ?? "custom",
        policy: policy.profile,
        forced: forceBehavior ?? "none",
      });

      try {
        const response = await fetch("/api/decide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_request: request,
            scenario_id: scenarioId,
            context: context ?? undefined,
            policy,
            system: "trustlayer",
            force_behavior: forceBehavior,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? "Request failed.");
        const nextRun = payload.run as Run;
        setRun(nextRun);
        setStatus("idle");

        const behavior = nextRun.decision.decision;
        track("decision_generated", {
          scenario_id: scenarioId ?? "custom",
          decision: behavior,
          rule_id: nextRun.decision.rule_id,
          policy: policy.profile,
          latency_ms: nextRun.latency_ms,
        });
        if (forceBehavior) {
          track("decision_overridden", {
            scenario_id: scenarioId ?? "custom",
            forced_to: forceBehavior,
          });
        }
        if (behavior === "ASK") track("clarification_requested", { scenario_id: scenarioId ?? "custom" });
        if (behavior === "VERIFY") {
          track("verification_started", {
            scenario_id: scenarioId ?? "custom",
            tools: nextRun.tool_calls.length,
          });
          if (nextRun.tool_results.length > 0) {
            track("verification_completed", {
              scenario_id: scenarioId ?? "custom",
              ok_results: nextRun.tool_results.filter((r) => r.status === "ok").length,
            });
          }
        }
        if (nextRun.final.behavior === "ESCALATE") {
          track("escalation_triggered", {
            scenario_id: scenarioId ?? "custom",
            category: nextRun.final.handoff_category ?? "unknown",
          });
        }
        if (nextRun.final.behavior === "ANSWER") {
          track("task_completed", {
            scenario_id: scenarioId ?? "custom",
            verified: nextRun.tool_results.length > 0,
          });
        }
      } catch (err) {
        setStatus("error");
        setError((err as Error).message);
        track("pipeline_error", { where: "decide", message: (err as Error).message.slice(0, 80) });
      }
    },
    [policy],
  );

  const onSelectScenario = (s: Scenario) => {
    setScenario(s);
    setCustomText("");
    void execute(s.user_request, s.context, s.id);
  };

  const onSubmitCustom = () => {
    const text = customText.trim();
    if (!text) return;
    setScenario(null);
    void execute(text, null, undefined);
  };

  const rerunWithPolicy = (next: PolicyConfig) => {
    setPolicy(next);
    track("policy_changed", {
      profile: next.profile,
      escalate_at_risk: next.escalate_at_risk,
      verify_at_risk: next.verify_at_risk,
      min_confidence: next.min_confidence_for_autonomy,
      strictness: next.authorization_strictness,
    });
  };

  const runBaselines = async () => {
    if (!submitted) return;
    setBaselineStatus("running");
    try {
      const systems: SystemVariant[] = ["direct_llm", "rag_agent"];
      const runs = await Promise.all(
        systems.map(async (system) => {
          const response = await fetch("/api/decide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_request: submitted.request,
              scenario_id: scenario?.id,
              context: submitted.context ?? undefined,
              policy,
              system,
            }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error ?? "Baseline request failed.");
          return [system, payload.run as Run] as const;
        }),
      );
      setBaselines(Object.fromEntries(runs) as Partial<Record<SystemVariant, Run>>);
      setBaselineStatus("idle");
    } catch (err) {
      setBaselineStatus("error");
      track("pipeline_error", { where: "baselines", message: (err as Error).message.slice(0, 80) });
    }
  };

  const scenarioById = useMemo(
    () => new Map(scenarios.map((s) => [s.id, s])),
    [scenarios],
  );

  /* Land on a populated decision rather than an empty state: the first thing a
     visitor sees should be the system doing the thing it exists to do. */
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    const target = initialScenarioId ? scenarioById.get(initialScenarioId) : undefined;
    if (!target) return;
    autoRan.current = true;
    setScenario(target);
    void execute(target.user_request, target.context, target.id);
  }, [initialScenarioId, scenarioById, execute]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <ScenarioPicker
            featured={featured}
            all={scenarios}
            selectedId={scenario?.id ?? null}
            customText={customText}
            onSelectScenario={onSelectScenario}
            onCustomTextChange={setCustomText}
            onSubmitCustom={onSubmitCustom}
            busy={busy}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">One request per behavior</span>
            {BEHAVIOR_PRESETS.map((preset) => {
              const target = scenarioById.get(preset.scenarioId);
              if (!target) return null;
              const active = scenario?.id === target.id;
              return (
                <button
                  key={preset.behavior}
                  type="button"
                  disabled={busy}
                  aria-pressed={active}
                  className={`btn px-2.5 py-1 font-mono text-[11.5px] ${
                    active ? "border-accent bg-accent-soft text-ink" : ""
                  }`}
                  onClick={() => onSelectScenario(target)}
                >
                  {preset.behavior}
                </button>
              );
            })}
          </div>
        </div>
        <PolicyControls config={policy} onChange={rerunWithPolicy} />
      </div>

      {policyChangedNotice(run, policy) && (
        <Callout tone="accent">
          The policy configuration changed after this run. Re-run the request to see the new
          behavior.{" "}
          <button
            type="button"
            className="underline underline-offset-4"
            disabled={busy || !submitted}
            onClick={() =>
              submitted && void execute(submitted.request, submitted.context, scenario?.id)
            }
          >
            Re-run
          </button>
        </Callout>
      )}

      {status === "error" && (
        <div className="border border-danger/40 bg-danger-soft px-4 py-3 text-[13px] text-ink">
          <div className="font-medium">The request could not be completed.</div>
          <p className="mt-1 text-[12.5px] text-ink-soft">{error}</p>
          <p className="mt-1 text-[12px] text-muted">
            No answer was produced and nothing was executed. This is the intended failure mode: the
            interface degrades rather than inventing a response.
          </p>
        </div>
      )}

      {status === "idle" && !run && (
        <EmptyState
          title="Waiting for a request"
          body="Pick one of the scenarios above or type your own. TrustLayer classifies the request, evaluates risk, evidence and authorization against the current policy, and only then chooses whether to answer, ask, verify or escalate."
        />
      )}

      {busy && <RunningState />}

      {run && !busy && submitted && (
        <>
          <TraceSummary run={run} />

          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            <RequestPanel
              userRequest={submitted.request}
              context={submitted.context}
              scenario={scenario}
            />
            <div className="min-w-0 space-y-4">
              <SystemStatePanel state={run.state} updatedState={run.updated_state} />
              <DecisionPanel
                decision={run.decision}
                postDecision={run.post_verification_decision}
                policyLabel={policyLabel(policy)}
                overridden={overridden}
                busy={busy}
                onOverride={(behavior) =>
                  submitted &&
                  void execute(submitted.request, submitted.context, scenario?.id, behavior)
                }
              />
            </div>
            <FinalBehaviorPanel final={run.final} toolResults={run.tool_results} />
          </div>

          {run.warnings.length > 0 && (
            <Callout>
              {run.warnings.map((w, i) => (
                <p key={i} className={i > 0 ? "mt-1" : ""}>
                  {w}
                </p>
              ))}
            </Callout>
          )}

          <ToolTrace calls={run.tool_calls} results={run.tool_results} />

          <TraceViewer run={run} />

          <Panel
            eyebrow="Comparison"
            title="What the two baseline systems do with the same request"
            aside={
              <button
                type="button"
                className="btn"
                disabled={baselineStatus === "running"}
                onClick={runBaselines}
              >
                {baselineStatus === "running" ? "Running…" : "Run baselines"}
              </button>
            }
          >
            {baselineStatus === "error" && (
              <p className="text-[12.5px] text-danger">
                The baseline comparison failed. TrustLayer&rsquo;s own result above is unaffected.
              </p>
            )}
            {!baselines && baselineStatus !== "running" && (
              <p className="text-[12.5px] leading-relaxed text-muted">
                Runs the identical request through System A (direct LLM) and System B (retrieval
                then answer). Both always answer; only their inputs differ.
              </p>
            )}
            {baselines && (
              <div className="space-y-4">
                <BaselineComparison runs={{ ...baselines, trustlayer: run }} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["direct_llm", "rag_agent"] as SystemVariant[]).map((system) => {
                    const baselineRun = baselines[system];
                    if (!baselineRun) return null;
                    return (
                      <div key={system} className="border border-line bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-ink">
                            {SYSTEM_SHORT_LABELS[system]}
                          </span>
                          <DecisionBadge behavior={baselineRun.final.behavior} size="sm" />
                        </div>
                        <p className="mt-1 text-[11.5px] text-muted">
                          {SYSTEM_DESCRIPTIONS[system]}
                        </p>
                        <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft">
                          {baselineRun.final.body}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11.5px] leading-relaxed text-muted">
                  One request, three designs, same fixtures. A behavioral comparison on a single
                  scenario — the benchmark page runs the whole labelled set.
                </p>
              </div>
            )}
          </Panel>
        </>
      )}

      <EventStream />
    </div>
  );
}

function policyChangedNotice(run: Run | null, policy: PolicyConfig) {
  if (!run) return false;
  return run.policy_profile !== policyLabel(policy);
}

const STAGES = [
  "Classifying the request",
  "Assessing risk, evidence and authorization",
  "Applying policy rules",
  "Retrieving evidence if the decision requires it",
];

function RunningState() {
  return (
    <div className="panel p-4" role="status" aria-live="polite">
      <div className="eyebrow">Working</div>
      <ul className="mt-2 space-y-1.5">
        {STAGES.map((stage) => (
          <li key={stage} className="flex items-center gap-2 text-[12.5px] text-muted">
            <span className="skeleton h-1.5 w-1.5 rounded-full" />
            {stage}
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
    </div>
  );
}
