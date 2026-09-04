import Link from "next/link";
import { Panel, Callout } from "@/components/ui";
import { RULE_INDEX } from "@/lib/policy/engine";
import { POLICY_PROFILES } from "@/lib/policy/config";
import { TOOL_CATALOG } from "@/lib/tools";
import { SCENARIOS } from "@/lib/evaluation/scenarios";
import { EVENT_CATALOG } from "@/lib/analytics/catalog";

export const metadata = {
  title: "About — TrustLayer",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <div className="eyebrow">Product thesis</div>
        <h1 className="mt-2">Deciding whether to answer is a product decision</h1>
      </header>

      <section className="space-y-3">
        <h2>Problem</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Language models are optimized to produce a response. Inside a real workflow — a support
          queue, an account console, a care coordination tool — a response is only one of several
          correct system behaviors, and often not the right one. The request may be under-specified,
          the claim underneath it unverified, the acting user unauthorized, or the judgment one that
          a licensed human owns. An assistant that treats all four cases as &ldquo;produce
          text&rdquo; fails in ways that look fluent.
        </p>
      </section>

      <section className="space-y-3">
        <h2>Hypothesis</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          A decision-policy layer that explicitly selects a behavior — answer, ask, verify or
          escalate — <em>before</em> generation or execution improves reliability more than
          improving the generation itself. The corollary is a cost: some requests that a direct
          assistant would have completed now take an extra turn, a tool call, or a human.
        </p>
        <Callout tone="accent">
          The objective is not minimizing escalation. The objective is minimizing inappropriate
          behavior while preserving useful autonomy.
        </Callout>
      </section>

      <section className="space-y-3">
        <h2>Why retrieval is not enough</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Retrieval answers <em>what evidence do I have?</em> It does not answer{" "}
          <em>what should I do given that evidence?</em> A retrieval agent handed a refund request
          can ground itself perfectly in the refund policy and still issue the refund without ever
          checking the transaction or the operator&rsquo;s permission. Grounding and appropriate
          autonomy are related, but they are not the same property, and only one of them is
          improved by better retrieval.
        </p>
      </section>

      <section className="space-y-3">
        <h2>Policy design</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Four behaviors, selected before generation, from explicit state rather than from model
          preference.
        </p>
        <div className="panel divide-y divide-line/70">
          {[
            {
              behavior: "ANSWER",
              when: "Sufficient evidence, low risk, nothing to authorize.",
            },
            {
              behavior: "ASK",
              when: "Information is missing and one clarification would resolve it.",
            },
            {
              behavior: "VERIFY",
              when: "An action is plausible but evidence or authorization must be checked first.",
            },
            {
              behavior: "ESCALATE",
              when: "High risk, material uncertainty, or a judgment a licensed human owns.",
            },
          ].map((row) => (
            <div key={row.behavior} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5">
              <span className="font-mono text-[12px] tracking-[0.1em] text-ink">
                {row.behavior}
              </span>
              <span className="text-[12.5px] text-muted">{row.when}</span>
            </div>
          ))}
        </div>
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          VERIFY is the behavior that carries the thesis: it is not a refusal but an
          evidence-gathering state, and when the evidence and the permission both hold, the policy
          re-evaluates and the action proceeds.
        </p>
      </section>

      <section className="space-y-3">
        <h2>What TrustLayer tests</h2>
        <ul className="space-y-2 text-[13.5px] leading-relaxed text-ink-soft">
          <li>
            <span className="text-ink">Appropriate autonomy.</span> Which requests a system should
            finish on its own, and which it should not.
          </li>
          <li>
            <span className="text-ink">Evidence sufficiency.</span> Whether what is known actually
            covers what was asked, and what to do when it does not.
          </li>
          <li>
            <span className="text-ink">Uncertainty.</span> What a system should do when its own
            classification confidence is below the bar it needs to act.
          </li>
          <li>
            <span className="text-ink">Authorization.</span> Whether permission is required, present
            or unobtainable — and that &ldquo;unobtainable&rdquo; is a decision input, not an error.
          </li>
          <li>
            <span className="text-ink">Human escalation.</span> Routing to a named handoff category
            instead of producing a plausible answer.
          </li>
          <li>
            <span className="text-ink">Reliability against friction.</span> The tradeoff, plotted
            from measured runs rather than asserted.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>How it is built</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel eyebrow="Classification" title="Model, narrowly scoped">
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              The model returns a schema-validated description of the request: task type, risk,
              reversibility, whether a licensed human owns the judgment, what is missing and who can
              supply it. It never chooses the behavior. If the call fails, times out or returns
              output that does not validate, a deterministic keyword classifier takes over and the
              run is labelled accordingly.
            </p>
          </Panel>
          <Panel eyebrow="Policy" title={`${RULE_INDEX.length} ordered rules`}>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              First matching rule wins, and its id travels with the decision. Thresholds live in one
              configuration object with three named profiles (
              {Object.values(POLICY_PROFILES)
                .map((p) => p.label.toLowerCase())
                .join(", ")}
              ) that can be edited live on the demo and the benchmark.
            </p>
          </Panel>
          <Panel eyebrow="Tools" title={`${TOOL_CATALOG.length} synthetic functions`}>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              A closed registry. The tool plan is derived from structured state, not from free-form
              model output, so the system cannot call something outside the registry or invent
              arguments. Results are folded back into state and the policy re-evaluates.
            </p>
          </Panel>
          <Panel eyebrow="Evaluation" title={`${SCENARIOS.length} labelled scenarios`}>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              Three systems, one grading function, metrics computed from runs performed in the
              browser session. Disagreements between the labels and the engine are reported as
              failures rather than relabelled.
            </p>
          </Panel>
        </div>
      </section>

      <section className="space-y-3">
        <h2>Explainability</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          The interface shows observable decision factors — risk, evidence status, authorization
          status, reversibility, information gap, classification confidence, and the rule that
          fired. It does not show, request or store model chain-of-thought. Hidden reasoning is not
          an explanation a product can stand behind; a named rule and a set of factual state fields
          is.
        </p>
      </section>

      <section className="space-y-3">
        <h2>Instrumentation</h2>
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          The events below are emitted as the product is used, buffered in-app and visible in the
          demo&rsquo;s event stream. If a PostHog key is present they are also sent to PostHog; if
          not, everything else works identically.
        </p>
        <div className="panel divide-y divide-line/70">
          {EVENT_CATALOG.map((e) => (
            <div key={e.name} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2">
              <span className="font-mono text-[12px] text-ink">{e.name}</span>
              <span className="text-[12px] text-muted">{e.when}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2>The experiment</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Three system designs run the same {SCENARIOS.length} labelled scenarios, with the same
          tool fixtures and the same grading function, so the decision policy is the only variable:
          a direct LLM that answers every request, a retrieval agent that grounds first and then
          answers, and TrustLayer, which selects a behavior before either. The benchmark runs in the
          browser and reports what it computes, including where the policy costs autonomy.
        </p>
        <Link
          href="/evaluation"
          className="inline-block text-[13px] text-accent underline underline-offset-4 hover:text-ink"
        >
          Run the benchmark →
        </Link>
      </section>

      <section id="limitations" className="scroll-mt-24 space-y-3">
        <h2>Limitations</h2>
        <ul className="space-y-2 text-[13.5px] leading-relaxed text-ink-soft">
          <li>
            · This is an independent AI product and evaluation project built with synthetic
            scenarios and simulated tools. It is not deployed in any real workflow and has no real
            users.
          </li>
          <li>
            · The scenarios and their labels were written by one person, and the same person wrote
            the policy. That is a real bias; the request-only evaluation mode exists partly to make
            the classifier work harder against it.
          </li>
          <li>
            · {SCENARIOS.length} scenarios is a small benchmark. Per-category rates move
            substantially with a single item.
          </li>
          <li>
            · No human-subject study has been run. The explanation experiment on the evaluation page
            is a design with an instrument attached, and is labelled as such.
          </li>
          <li>
            · The escalation handoff is simulated. No human is connected, and the app says so
            wherever it escalates.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>What I would test next</h2>
        <ul className="space-y-2 text-[13.5px] leading-relaxed text-ink-soft">
          <li>· A larger benchmark, with the labels audited by someone who did not write the policy.</li>
          <li>· Integration against a real workflow, where the tools have latency and failure modes.</li>
          <li>· Human calibration: whether operators agree with the behavior the policy selected.</li>
          <li>· Threshold tuning per task type, rather than one risk ladder for every domain.</li>
          <li>· Operating telemetry — takeover rate, repeat corrections, time to completion.</li>
        </ul>
      </section>

      <section className="border-t border-line pt-6">
        <div className="eyebrow">Built by</div>
        <p className="mt-1 text-[13.5px] text-ink">Isabella Bider</p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Independent AI product experiment · product thesis, system design, implementation and
          evaluation
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link href="/demo" className="btn-primary">
            Try a scenario
          </Link>
          <a
            href="https://www.linkedin.com/in/ibider/"
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-muted underline underline-offset-4 hover:text-ink"
          >
            LinkedIn
          </a>
        </div>
      </section>
    </div>
  );
}
