const STEPS = [
  { label: "Request", detail: "typed, or arriving from a queue" },
  { label: "Classify", detail: "task, risk, evidence, authorization, reversibility" },
  { label: "Policy", detail: "ordered deterministic rules over that state", key: true },
  { label: "Behavior", detail: "answer · ask · verify · escalate", key: true },
  { label: "Tool if needed", detail: "only when the behavior calls for it" },
  { label: "Supported response", detail: "with the evidence it rests on" },
];

/**
 * Steps 03 and 04 carry the accent because the policy and the behavior it
 * selects are the only parts of this pipeline that differ from a normal
 * assistant.
 */
export function FlowDiagram() {
  return (
    <ol
      className="grid items-stretch gap-x-1 gap-y-2 sm:grid-cols-2 lg:grid-cols-[repeat(6,minmax(0,1fr))]"
      aria-label="How a request flows through TrustLayer"
    >
      {STEPS.map((step, i) => (
        <li key={step.label} className="relative flex items-stretch">
          <div
            className={`flex-1 border px-3 py-2.5 ${
              step.key ? "border-accent bg-accent-soft" : "border-line bg-panel"
            }`}
          >
            <div className={`eyebrow ${step.key ? "text-accent" : ""}`}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[13px] font-medium leading-snug text-ink">{step.label}</div>
            <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{step.detail}</div>
          </div>
          {i < STEPS.length - 1 && (
            <span
              aria-hidden
              className="hidden self-center px-0.5 text-[12px] text-line-strong lg:block"
            >
              →
            </span>
          )}
          {i < STEPS.length - 1 && (
            <span
              aria-hidden
              className="absolute -bottom-2 left-4 text-[11px] leading-none text-line-strong sm:hidden"
            >
              ↓
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
