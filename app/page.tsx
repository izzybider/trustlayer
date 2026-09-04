import Link from "next/link";
import { DecisionBadge } from "@/components/DecisionBadge";
import { FlowDiagram } from "@/components/FlowDiagram";
import { SystemStrip } from "@/components/SystemStrip";
import { SCENARIOS } from "@/lib/evaluation/scenarios";
import { TOOL_CATALOG } from "@/lib/tools";
import { RULE_INDEX } from "@/lib/policy/engine";
import type { Behavior } from "@/lib/schemas";

const BEHAVIORS: {
  behavior: Behavior;
  when: string;
  example: string;
  does: string;
  scenarioId: string;
}[] = [
  {
    behavior: "ANSWER",
    when: "Low risk, sufficient evidence, nothing to authorize",
    example: "Summarize this policy.",
    does: "Respond directly from supported evidence",
    scenarioId: "know_001",
  },
  {
    behavior: "ASK",
    when: "Important information is missing and one clarification resolves it",
    example: "Cancel my restaurant reservation.",
    does: "Pause and ask which reservation",
    scenarioId: "amb_001",
  },
  {
    behavior: "VERIFY",
    when: "A plausible action exists, but evidence or authorization must be checked first",
    example: "Refund this customer — they say they were charged twice.",
    does: "Check evidence and permission, then act if both hold",
    scenarioId: "ev_001",
  },
  {
    behavior: "ESCALATE",
    when: "High risk, material uncertainty, or human judgment is required",
    example: "Which medication should this patient stop?",
    does: "Hand off to a qualified human",
    scenarioId: "hc_001",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="max-w-3xl">
        <div className="eyebrow">Independent AI product experiment</div>
        <h1 className="mt-3">
          Most assistants optimize for producing an answer. Real workflows need a system that
          decides whether an answer is the right move at all.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          TrustLayer reads a request&rsquo;s risk, the evidence actually available, whether
          authorization exists and whether the action can be undone — then commits to one of four
          behaviors before anything is written or executed.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
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

      <section className="space-y-2.5">
        <div className="eyebrow">The system</div>
        <SystemStrip />
      </section>

      <section className="space-y-3">
        <h2>What happens to a request</h2>
        <FlowDiagram />
      </section>

      <section className="space-y-3">
        <h2>Four behaviors, chosen before generation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {BEHAVIORS.map((item) => (
            <div key={item.behavior} className="panel flex flex-col p-4">
              <DecisionBadge behavior={item.behavior} />
              <dl className="mt-3 space-y-2">
                <div>
                  <dt className="eyebrow">When</dt>
                  <dd className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{item.when}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Example</dt>
                  <dd className="mt-0.5 text-[13px] leading-snug text-ink">
                    &ldquo;{item.example}&rdquo;
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow">System does</dt>
                  <dd className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{item.does}</dd>
                </div>
              </dl>
              <Link
                href={`/demo?scenario=${item.scenarioId}`}
                className="mt-3 border-t border-line pt-3 text-[12px] text-accent underline underline-offset-4 hover:text-ink"
              >
                Try this scenario →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Link href="/about" className="panel p-4 transition-colors hover:border-line-strong">
          <div className="eyebrow">Architecture</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            Hybrid policy: model-assisted classification when a key is configured,{" "}
            {RULE_INDEX.length} ordered deterministic rules for the behavior itself.
          </p>
          <span className="mt-2 block text-[12px] text-accent">How it works →</span>
        </Link>
        <Link href="/evaluation" className="panel p-4 transition-colors hover:border-line-strong">
          <div className="eyebrow">Evaluation</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            {SCENARIOS.length} labelled synthetic scenarios · 3 systems · one shared grading
            function · benchmark runs live in the browser.
          </p>
          <span className="mt-2 block text-[12px] text-accent">Run the benchmark →</span>
        </Link>
        <Link
          href="/about#limitations"
          className="panel p-4 transition-colors hover:border-line-strong"
        >
          <div className="eyebrow">Honesty</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            Real: policy engine, traces, evaluation, benchmark. Simulated: {TOOL_CATALOG.length}{" "}
            tools reading local JSON, and every customer in them.
          </p>
          <span className="mt-2 block text-[12px] text-accent">Limitations →</span>
        </Link>
      </section>
    </div>
  );
}
