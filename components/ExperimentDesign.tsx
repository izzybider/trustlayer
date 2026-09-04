import { SCENARIOS } from "@/lib/evaluation/scenarios";
import { TOOL_CATALOG } from "@/lib/tools";

const CONTROLS = [
  {
    label: "Same scenario set",
    detail: `All three systems run the same ${SCENARIOS.length} synthetic scenarios in the same order.`,
  },
  {
    label: "Same expected-behavior labels",
    detail: "Labels are written per scenario and are not adjusted per system.",
  },
  {
    label: "Same tool fixtures",
    detail: `The same ${TOOL_CATALOG.length} simulated tools and the same local JSON records back every run.`,
  },
  {
    label: "Same grading function",
    detail: "One scoring path computes every metric and failure class for every system.",
  },
];

/**
 * Methodology header. The point of the page is that only the policy differs,
 * so the controls are stated before any number is shown.
 */
export function ExperimentDesign() {
  return (
    <section className="panel" aria-labelledby="experiment-design">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Experiment design</div>
          <h3 id="experiment-design" className="mt-0.5 text-[14px]">
            What is held constant, and what is being varied
          </h3>
        </div>
        <span className="chip">Synthetic benchmark</span>
      </div>

      <div className="grid gap-x-6 gap-y-4 p-4 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="eyebrow">Held constant</div>
          <dl className="mt-2 space-y-2">
            {CONTROLS.map((control) => (
              <div key={control.label}>
                <dt className="text-[12.5px] font-medium text-ink">{control.label}</dt>
                <dd className="text-[12px] leading-snug text-muted">{control.detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <div className="eyebrow">Independent variable</div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
            The decision policy, and nothing else.
          </p>
          <ol className="mt-2.5 space-y-1.5">
            <li className="border border-line bg-white px-3 py-2 text-[12.5px]">
              <span className="font-mono text-[11px] text-muted">A</span>{" "}
              <span className="text-ink">Direct LLM</span>{" "}
              <span className="text-muted">— answers every request</span>
            </li>
            <li className="border border-line bg-white px-3 py-2 text-[12.5px]">
              <span className="font-mono text-[11px] text-muted">B</span>{" "}
              <span className="text-ink">RAG agent</span>{" "}
              <span className="text-muted">— retrieves, then answers</span>
            </li>
            <li className="border border-accent bg-accent-soft px-3 py-2 text-[12.5px]">
              <span className="font-mono text-[11px] text-accent">C</span>{" "}
              <span className="text-ink">TrustLayer</span>{" "}
              <span className="text-muted">— chooses a behavior, then acts</span>
            </li>
          </ol>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
            Synthetic scenarios and simulated tools. These are behavioral results on a fixture set,
            not production performance, and no human study has been run.
          </p>
        </div>
      </div>
    </section>
  );
}
