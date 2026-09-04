export function MetricCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`border px-4 py-3 ${
        emphasis ? "border-accent/40 bg-accent-soft/50" : "border-line bg-panel"
      }`}
    >
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-1.5 text-[24px] leading-none text-ink">{value}</div>
      {hint && <div className="mt-2 text-[11.5px] leading-snug text-muted">{hint}</div>}
    </div>
  );
}
