import Link from "next/link";
import { DecisionBadge, decisionGloss } from "@/components/DecisionBadge";
import { FlowDiagram } from "@/components/FlowDiagram";
import { Panel } from "@/components/ui";
import { SCENARIOS } from "@/lib/evaluation/scenarios";
import { TOOL_CATALOG } from "@/lib/tools";
import { RULE_INDEX } from "@/lib/policy/engine";
import type { Behavior } from "@/lib/schemas";

const EXAMPLES: { behavior: Behavior; request: string; because: string }[] = [
  {
    behavior: "ANSWER",
    request: "Summarize this policy.",
    because: "Low risk, evidence supplied, nothing to authorize.",
  },
  {
    behavior: "ASK",
    request: "Cancel my restaurant reservation.",
    because: "Two bookings exist. One question settles it.",
  },
  {
    behavior: "VERIFY",
    request: "Refund this customer, they say they were charged twice.",
    because: "The claim and the agent's permission both need checking first.",
  },
  {
    behavior: "ESCALATE",
    request: "Which medication should this patient stop?",
    because: "A licensed clinician owns this decision, not an assistant.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="max-w-3xl">
        <div className="eyebrow">Independent AI product experiment</div>
        <h1 className="mt-3">
          Most assistants optimize for producing an answer. Real workflows need a system that
          decides whether an answer is the right move at all.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          TrustLayer puts a decision-policy layer in front of generation. Before anything is written
          or executed, it reads the request&rsquo;s risk, the evidence actually available, whether
          authorization exists, and whether the action can be undone — then commits to one of four
          behaviors: <span className="font-mono text-[13px]">ANSWER</span>,{" "}
          <span className="font-mono text-[13px]">ASK</span>,{" "}
          <span className="font-mono text-[13px]">VERIFY</span> or{" "}
          <span className="font-mono text-[13px]">ESCALATE</span>.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/demo" className="btn-primary">
            Try a scenario
          </Link>
          <Link href="/evaluation" className="btn">
            See the benchmark
          </Link>
          <Link
            href="/about"
            className="text-[13px] text-muted underline underline-offset-4 hover:text-ink"
          >
            Read the thesis
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2>What happens to a request</h2>
        <FlowDiagram />
      </section>

      <section className="space-y-3">
        <h2>Four behaviors, chosen before generation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map((example) => (
            <div key={example.behavior} className="panel p-4">
              <DecisionBadge behavior={example.behavior} />
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink">
                &ldquo;{example.request}&rdquo;
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{example.because}</p>
              <p className="mt-2 text-[11.5px] text-muted">{decisionGloss(example.behavior)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel eyebrow="Architecture" title="Hybrid, not model-decides-everything">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            The model classifies: what kind of task, how risky, what is missing, who can supply it.
            The behavior itself comes from {RULE_INDEX.length} ordered deterministic rules over that
            classification, so the same state always produces the same decision and every decision
            names the rule that produced it.
          </p>
        </Panel>
        <Panel eyebrow="Evaluation" title="Numbers computed in front of you">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            {SCENARIOS.length} labelled synthetic scenarios, three systems, one grading function.
            The benchmark page runs live; where TrustLayer trades autonomy or latency for safety,
            the chart shows it rather than hiding it.
          </p>
        </Panel>
        <Panel eyebrow="Honesty" title="What is real and what is simulated">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            Real: the policy engine, the decisions, the traces, the metrics, the model calls when a
            key is configured. Simulated: {TOOL_CATALOG.length} tools reading local JSON, every
            customer and patient in them, and the human on the other end of an escalation.
          </p>
        </Panel>
      </section>
    </div>
  );
}
