import type { ReactNode } from "react";

export function Panel({
  title,
  eyebrow,
  aside,
  children,
  className = "",
  bodyClassName = "p-4",
}: {
  title?: ReactNode;
  eyebrow?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow || aside) && (
        <div className="panel-header">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h3 className="mt-0.5 text-[14px]">{title}</h3>}
          </div>
          {aside}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "bad"
          ? "text-danger"
          : "text-ink";
  return (
    <div className="rule-row">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className={`kv text-right ${toneClass}`}>{value}</span>
    </div>
  );
}

export function Callout({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent";
}) {
  return (
    <div
      className={`border-l-2 px-4 py-3 text-[13px] leading-relaxed ${
        tone === "accent"
          ? "border-accent bg-accent-soft/60 text-ink"
          : "border-line-strong bg-white text-ink-soft"
      }`}
    >
      {children}
    </div>
  );
}

export function JsonPanel({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="border border-line bg-white">
      <summary className="flex items-center justify-between px-4 py-2.5 text-[12.5px] text-muted hover:text-ink">
        <span>{label}</span>
        <span aria-hidden className="font-mono text-[11px]">
          JSON
        </span>
      </summary>
      <pre className="max-h-96 overflow-auto border-t border-line bg-paper px-4 py-3 font-mono text-[11.5px] leading-relaxed text-ink-soft">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-2 border border-dashed border-line-strong bg-white/50 px-4 py-8">
      <div className="text-[13.5px] font-medium text-ink">{title}</div>
      <p className="max-w-md text-[12.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="border border-line bg-panel px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-1 text-[22px] leading-none text-ink">{value}</div>
      {hint && <div className="mt-1.5 text-[11.5px] leading-snug text-muted">{hint}</div>}
    </div>
  );
}
