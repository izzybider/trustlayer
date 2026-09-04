const STEPS = [
  { label: "User request", detail: "typed, or arriving from a queue" },
  { label: "Classify", detail: "task, risk, reversibility, what is missing" },
  { label: "Policy", detail: "deterministic rules over that state" },
  { label: "Behavior", detail: "answer · ask · verify · escalate" },
  { label: "Tools", detail: "only when the behavior calls for them" },
  { label: "Supported response", detail: "with the evidence it rests on" },
];

export function FlowDiagram() {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6" aria-label="How a request flows through TrustLayer">
      {STEPS.map((step, i) => (
        <li
          key={step.label}
          className={`relative border bg-panel px-3 py-3 ${
            i === 3 ? "border-accent bg-accent-soft/60" : "border-line"
          }`}
        >
          <div className="eyebrow">{String(i + 1).padStart(2, "0")}</div>
          <div className="mt-1 text-[13px] font-medium leading-snug text-ink">{step.label}</div>
          <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{step.detail}</div>
        </li>
      ))}
    </ol>
  );
}
