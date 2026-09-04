/**
 * The whole system on one line. Sits directly under the thesis so a reader
 * knows what TrustLayer *is* before deciding whether to keep reading.
 */
const STAGES = [
  { label: "User request", tone: "plain" as const },
  {
    label: "Classify",
    detail: "task · risk · evidence · authorization · reversibility",
    tone: "plain" as const,
  },
  { label: "Policy", tone: "accent" as const },
  { label: "Answer · Ask · Verify · Escalate", tone: "accent" as const },
  { label: "Tool / retrieval", detail: "only when the behavior calls for it", tone: "plain" as const },
  { label: "Supported response or action", tone: "plain" as const },
  { label: "Trace + evaluation", tone: "plain" as const },
];

export function SystemStrip() {
  return (
    <ol
      className="flex flex-wrap items-stretch gap-1.5"
      aria-label="TrustLayer request pipeline"
    >
      {STAGES.map((stage, i) => (
        <li key={stage.label} className="flex items-stretch gap-1.5">
          <div
            className={`flex flex-col justify-center border px-2.5 py-1.5 ${
              stage.tone === "accent"
                ? "border-accent bg-accent-soft"
                : "border-line bg-panel"
            }`}
          >
            <span
              className={`font-mono text-[11px] uppercase tracking-[0.08em] ${
                stage.tone === "accent" ? "text-accent" : "text-ink-soft"
              }`}
            >
              {stage.label}
            </span>
            {stage.detail && (
              <span className="mt-0.5 text-[10.5px] leading-snug text-muted">{stage.detail}</span>
            )}
          </div>
          {i < STAGES.length - 1 && (
            <span aria-hidden className="self-center text-[11px] text-line-strong">
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
