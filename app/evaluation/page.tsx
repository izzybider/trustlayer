import { EvaluationClient } from "@/components/EvaluationClient";
import { ExperimentPanel } from "@/components/ExperimentPanel";
import { SCENARIOS, CATEGORY_LABELS } from "@/lib/evaluation/scenarios";
import { modelEnabled } from "@/lib/ai/client";
import type { ScenarioCategory } from "@/lib/schemas";

export const metadata = {
  title: "Evaluation lab — TrustLayer",
};

export default function EvaluationPage() {
  const byCategory = SCENARIOS.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + 1;
    return acc;
  }, {});
  const byExpected = SCENARIOS.reduce<Record<string, number>>((acc, s) => {
    acc[s.expected_behavior] = (acc[s.expected_behavior] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <div className="eyebrow">Evaluation lab</div>
        <h1 className="mt-2">Does deciding first actually help?</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          Three systems run against the same {SCENARIOS.length} scenarios: a direct LLM, a retrieval
          agent, and TrustLayer. Nothing here is precomputed or illustrative — press run and the
          numbers are calculated from runs that happen in front of you.
        </p>
      </header>

      <EvaluationClient scenarios={SCENARIOS} modelAvailable={modelEnabled()} />

      <section className="space-y-3">
        <h2>The scenario set</h2>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-soft">
          {SCENARIOS.length} hand-written synthetic scenarios across ten categories, each labelled
          with an expected behavior, the behaviors that are also acceptable, and a one-line
          rationale. The labels are a product judgment, written before the policy engine was tuned
          against them; where the engine disagrees, the disagreement is reported rather than
          relabelled.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="panel p-4">
            <div className="eyebrow">By category</div>
            <ul className="mt-2 space-y-1">
              {Object.entries(byCategory).map(([category, count]) => (
                <li key={category} className="flex justify-between gap-3 text-[12.5px]">
                  <span className="text-ink-soft">
                    {CATEGORY_LABELS[category as ScenarioCategory]}
                  </span>
                  <span className="tabular text-muted">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-4">
            <div className="eyebrow">By expected behavior</div>
            <ul className="mt-2 space-y-1">
              {Object.entries(byExpected).map(([behavior, count]) => (
                <li key={behavior} className="flex justify-between gap-3 text-[12.5px]">
                  <span className="font-mono text-ink-soft">{behavior}</span>
                  <span className="tabular text-muted">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-4">
            <div className="eyebrow">Known limitations</div>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-muted">
              <li>· The scenarios and the labels were written by the same person.</li>
              <li>· {SCENARIOS.length} scenarios is small; per-category rates move a lot per item.</li>
              <li>· Tools are local fixtures, so retrieval never has real-world noise.</li>
              <li>
                · In host-supplied mode the fixture hands the classifier most of the state, which
                flatters the classification step. Request-only mode is the harder read.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2>Product experiment</h2>
        <ExperimentPanel />
      </section>
    </div>
  );
}
