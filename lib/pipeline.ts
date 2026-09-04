import { classifyRequest, buildState } from "@/lib/ai/classify";
import { buildFinalBehavior, directAnswer, type ClarificationVariant } from "@/lib/ai/generate";
import { modelEnabled, newUsage } from "@/lib/ai/client";
import { applyToolResults, decide } from "@/lib/policy/engine";
import { policyLabel, type PolicyConfig } from "@/lib/policy/config";
import { planToolCalls, runTool } from "@/lib/tools";
import type {
  Behavior,
  PolicyDecision,
  Run,
  ScenarioContext,
  StructuredState,
  SystemVariant,
  ToolCall,
  ToolResult,
  TraceEvent,
} from "@/lib/schemas";

/**
 * The request pipeline, shared by the live demo and the benchmark.
 *
 *   classify -> policy decision -> (tools) -> updated state -> re-decide -> generate
 *
 * All three system variants run through this file so that the comparison in the
 * Evaluation Lab differs only in the parts that are supposed to differ.
 */

export type PipelineInput = {
  user_request: string;
  context: ScenarioContext;
  scenario_id?: string;
};

export type PipelineOptions = {
  policy: PolicyConfig;
  useModel: boolean;
  clarificationVariant?: ClarificationVariant;
  /** A reviewer can override the policy decision; the rest of the pipeline then
   *  executes the overridden behaviour, and the trace records who chose it. */
  forceBehavior?: Behavior;
};

class TraceBuilder {
  private events: TraceEvent[] = [];
  private start = performance.now();
  add(
    step: TraceEvent["step"],
    title: string,
    detail: string,
    status: TraceEvent["status"] = "ok",
    data?: unknown,
  ) {
    this.events.push({
      id: `t${this.events.length + 1}`,
      step,
      title,
      detail,
      status,
      at_ms: Math.round((performance.now() - this.start) * 10) / 10,
      data,
    });
  }
  get all() {
    return this.events;
  }
  get elapsed() {
    return Math.round((performance.now() - this.start) * 10) / 10;
  }
}

function decisionTraceDetail(d: PolicyDecision) {
  return `${d.decision} — ${d.reason}`;
}

function baselineDecision(
  state: StructuredState,
  ruleId: string,
  reason: string,
): PolicyDecision {
  return {
    decision: "ANSWER",
    rule_id: ruleId,
    risk_level: state.risk_level,
    evidence_status: state.evidence_status,
    authorization_status: state.authorization_status,
    reversibility: state.reversible,
    information_gap: state.information_gap,
    missing_information: state.missing_information,
    reason,
    next_step: "Generate a response.",
    confidence: state.classification_confidence,
    factors: [],
  };
}

async function classifyStage(
  input: PipelineInput,
  opts: PipelineOptions,
  usage: ReturnType<typeof newUsage>,
  trace: TraceBuilder,
) {
  trace.add("user_request", "User request", input.user_request);
  const { classification, source, warnings } = await classifyRequest(
    input.user_request,
    input.context,
    usage,
    { useModel: opts.useModel },
  );
  const state = buildState(input.user_request, input.context, classification, source);
  trace.add(
    "task_classification",
    "Task classification",
    `${state.task_type.replace(/_/g, " ")} · ${state.domain} · classified by ${
      source === "model" ? "model" : "deterministic classifier"
    } at ${(state.classification_confidence * 100).toFixed(0)}% confidence`,
    "ok",
    { rationale: state.classifier_rationale },
  );
  trace.add(
    "risk_assessment",
    "Risk assessment",
    `Risk ${state.risk_level} · ${state.reversible.replace(/_/g, " ")}${
      state.requires_professional_judgment ? " · professional judgment required" : ""
    }`,
  );
  trace.add(
    "evidence_assessment",
    "Evidence assessment",
    `${state.evidence_status.replace(/_/g, " ")} · ${
      state.available_evidence.length
    } item(s) supplied · gap: ${state.information_gap.replace(/_/g, " ")}`,
    state.evidence_status === "sufficient" ? "ok" : "warn",
  );
  trace.add(
    "authorization_requirement",
    "Authorization requirement",
    state.authorization_required
      ? `Required · currently ${state.authorization_status}`
      : "Not required for this task",
    state.authorization_required && state.authorization_status !== "present" ? "warn" : "ok",
  );
  return { state, warnings };
}

function executeTools(calls: ToolCall[], trace: TraceBuilder): ToolResult[] {
  const results: ToolResult[] = [];
  for (const call of calls) {
    trace.add(
      "tool_call",
      `Tool call — ${call.label}`,
      `${call.tool}(${Object.entries(call.args)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")})`,
      "ok",
      call,
    );
    const result = runTool(call);
    results.push(result);
    trace.add(
      "tool_result",
      `Tool result — ${call.label}`,
      result.summary,
      result.status === "ok" ? "ok" : result.status === "not_found" ? "warn" : "fail",
      result,
    );
  }
  return results;
}

export async function runSystem(
  system: SystemVariant,
  input: PipelineInput,
  opts: PipelineOptions,
): Promise<Run> {
  const usage = newUsage();
  const trace = new TraceBuilder();
  const warnings: string[] = [];
  const useModel = opts.useModel && modelEnabled();
  const variant: ClarificationVariant = opts.clarificationVariant ?? "B";

  const { state, warnings: classifyWarnings } = await classifyStage(
    input,
    { ...opts, useModel },
    usage,
    trace,
  );
  warnings.push(...classifyWarnings);

  let decision: PolicyDecision;
  let postDecision: PolicyDecision | undefined;
  let calls: ToolCall[] = [];
  let results: ToolResult[] = [];
  let finalState = state;

  if (system === "direct_llm") {
    decision = baselineDecision(
      state,
      "baseline_direct_llm",
      "Baseline A has no decision layer: every request is treated as something to answer.",
    );
    trace.add("decision", "Baseline decision", decisionTraceDetail(decision), "warn");
    const { text, generator } = await directAnswer(state, usage, useModel);
    trace.add("final_behavior", "Final behaviour", "ANSWER (no policy gate)", "warn");
    trace.add("outcome", "Outcome", "Answer returned without evidence or authorization checks.", "warn");
    return {
      id: `run_${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      system,
      scenario_id: input.scenario_id,
      user_request: input.user_request,
      state,
      decision,
      tool_calls: [],
      tool_results: [],
      final: {
        behavior: "ANSWER",
        headline: "Answered immediately",
        body: text,
        bullets: [],
        grounded_in: [],
        generator,
      },
      trace: trace.all,
      latency_ms: trace.elapsed,
      usage: useModel ? usage : null,
      mode: useModel ? "model" : "deterministic",
      policy_profile: "none (baseline)",
      warnings,
    };
  }

  if (system === "rag_agent") {
    calls = planToolCalls(state).filter((c) => c.tool !== "checkAuthorization");
    if (calls.length > 0) {
      results = executeTools(calls, trace);
      const applied = applyToolResults(state, results);
      finalState = applied.state;
      trace.add("state_update", "Updated system state", applied.notes.join(" ") || "No change.");
    } else {
      trace.add(
        "state_update",
        "Updated system state",
        "No retrieval source matched this request; answering from general knowledge.",
        "warn",
      );
    }
    decision = baselineDecision(
      finalState,
      "baseline_rag_agent",
      "Baseline B retrieves what it can and then always answers. It has no ASK, VERIFY or ESCALATE behaviour.",
    );
    trace.add("decision", "Baseline decision", decisionTraceDetail(decision), "warn");
    const { text, generator } = await (async () => {
      const built = await buildFinalBehavior({
        state: finalState,
        decision,
        toolResults: results,
        usage,
        useModel,
        clarificationVariant: variant,
      });
      warnings.push(...built.warnings);
      return { text: built.final.body, generator: built.final.generator };
    })();
    trace.add("final_behavior", "Final behaviour", "ANSWER (retrieval-backed, no policy gate)", "warn");
    trace.add(
      "outcome",
      "Outcome",
      results.some((r) => r.status === "ok")
        ? "Answer returned using retrieved evidence."
        : "Answer returned even though retrieval produced nothing usable.",
      results.some((r) => r.status === "ok") ? "ok" : "warn",
    );
    return {
      id: `run_${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      system,
      scenario_id: input.scenario_id,
      user_request: input.user_request,
      state,
      updated_state: results.length > 0 ? finalState : undefined,
      decision,
      tool_calls: calls,
      tool_results: results,
      final: {
        behavior: "ANSWER",
        headline: results.some((r) => r.status === "ok")
          ? "Answered after retrieval"
          : "Answered without usable retrieval",
        body: text,
        bullets: results.map((r) => r.summary).slice(0, 3),
        grounded_in: results.filter((r) => r.status === "ok").map((r) => r.summary),
        generator,
      },
      trace: trace.all,
      latency_ms: trace.elapsed,
      usage: useModel ? usage : null,
      mode: useModel ? "model" : "deterministic",
      policy_profile: "none (baseline)",
      warnings,
    };
  }

  /* ---------------- TrustLayer ---------------- */

  decision = decide(state, opts.policy);
  if (opts.forceBehavior && opts.forceBehavior !== decision.decision) {
    trace.add(
      "decision",
      "Policy decision (overridden)",
      `Policy selected ${decision.decision}; a reviewer overrode it to ${opts.forceBehavior}.`,
      "warn",
      { policy_rule_id: decision.rule_id, policy_decision: decision.decision },
    );
    warnings.push(
      `Reviewer override: the policy chose ${decision.decision} (${decision.rule_id}) and ${opts.forceBehavior} was executed instead.`,
    );
    decision = {
      ...decision,
      decision: opts.forceBehavior,
      rule_id: "human_override",
      reason: `A reviewer overrode the policy decision. The policy itself selected ${decision.decision}: ${decision.reason}`,
      next_step:
        opts.forceBehavior === "VERIFY"
          ? "Retrieve the supporting record, then re-evaluate."
          : opts.forceBehavior === "ASK"
            ? "Ask the user for the missing detail."
            : opts.forceBehavior === "ESCALATE"
              ? "Hand off to a human reviewer."
              : "Answer directly.",
    };
  }
  trace.add(
    "decision",
    "TrustLayer decision",
    decisionTraceDetail(decision),
    decision.decision === "ANSWER" ? "ok" : "warn",
    { rule_id: decision.rule_id, next_step: decision.next_step },
  );

  if (decision.decision === "VERIFY") {
    calls = planToolCalls(state);
    if (calls.length === 0) {
      trace.add(
        "tool_call",
        "Tool call",
        "Verification was required but no registered tool covers this request.",
        "fail",
      );
      finalState = { ...state, tool_available: false, information_gap: "unresolved" };
      postDecision = decide(finalState, opts.policy, { postVerification: true });
      warnings.push("Verification was required but no tool in the registry could supply the evidence.");
    } else {
      results = executeTools(calls, trace);
      const applied = applyToolResults(state, results);
      finalState = applied.state;
      trace.add(
        "state_update",
        "Updated system state",
        applied.notes.join(" ") || "No change.",
        results.every((r) => r.status === "ok") ? "ok" : "warn",
        {
          evidence_status: finalState.evidence_status,
          authorization_status: finalState.authorization_status,
          information_gap: finalState.information_gap,
        },
      );
      postDecision = decide(finalState, opts.policy, { postVerification: true });
      trace.add(
        "decision",
        "Post-verification decision",
        decisionTraceDetail(postDecision),
        postDecision.decision === "ANSWER" ? "ok" : "warn",
        { rule_id: postDecision.rule_id },
      );
    }
  }

  const effective = postDecision ?? decision;
  const { final, warnings: genWarnings } = await buildFinalBehavior({
    state: finalState,
    decision: effective,
    toolResults: results,
    usage,
    useModel,
    clarificationVariant: variant,
  });
  warnings.push(...genWarnings);

  trace.add(
    "final_behavior",
    "Final behaviour",
    `${final.behavior} — ${final.headline}`,
    final.behavior === "ANSWER" ? "ok" : "warn",
  );
  trace.add(
    "outcome",
    "Outcome",
    decision.decision === "VERIFY" && effective.decision === "ANSWER"
      ? "Verification completed and the action is now supported by retrieved evidence."
      : effective.decision === "ESCALATE"
        ? `Stopped and handed off: ${final.handoff_category ?? "human reviewer"}.`
        : effective.decision === "ASK"
          ? "Paused for one clarifying question rather than guessing."
          : "Answered within the autonomous band.",
    effective.decision === "ANSWER" ? "ok" : "warn",
  );

  return {
    id: `run_${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
    system,
    scenario_id: input.scenario_id,
    user_request: input.user_request,
    state,
    updated_state: finalState === state ? undefined : finalState,
    decision,
    post_verification_decision: postDecision,
    tool_calls: calls,
    tool_results: results,
    final,
    trace: trace.all,
    latency_ms: trace.elapsed,
    usage: useModel ? usage : null,
    mode: useModel ? "model" : "deterministic",
    policy_profile: policyLabel(opts.policy),
    warnings,
  };
}
