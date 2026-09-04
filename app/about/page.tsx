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
    <div className="max-w-3xl space-y-10">
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

      <section>
        <Link href="/demo" className="btn-primary">
          Try a scenario
        </Link>
      </section>
    </div>
  );
}
