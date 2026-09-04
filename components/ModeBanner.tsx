/**
 * Compact run-mode indicator.
 *
 * Deliberately small: which classifier is running is useful context, not the
 * headline. The disclosure explains that no key is needed and that the parts
 * that matter — policy, traces, tool calls, benchmark — run live either way.
 */
export function ModeBanner({
  modelEnabled,
  model,
}: {
  modelEnabled: boolean;
  model: string;
}) {
  return (
    <details className="relative">
      <summary
        className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap border border-line-strong bg-white px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:text-ink"
        aria-label={
          modelEnabled ? "Model-assisted mode. Details." : "Demo mode. Details."
        }
      >
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            modelEnabled ? "bg-ok" : "bg-line-strong"
          }`}
        />
        {modelEnabled ? (
          <span className="text-ink">Model-assisted mode</span>
        ) : (
          <>
            <span className="text-ink">Demo mode</span>
            <span className="hidden sm:inline">· deterministic classifier</span>
          </>
        )}
        <span aria-hidden className="text-[10px] text-muted">
          ⌄
        </span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-1.5 w-[19rem] border border-line bg-panel p-3 text-[12px] leading-relaxed text-ink-soft shadow-sm">
        {modelEnabled ? (
          <p>
            Classification and answer text come from{" "}
            <span className="font-mono text-[11.5px]">{model}</span>. The decision itself is always
            the deterministic policy — the model never chooses the behavior. Model-assisted mode is
            not more valid than demo mode; it exercises a different classifier.
          </p>
        ) : (
          <p>
            No API key is required. Classification uses deterministic rules; decisions, traces, tool
            calls and benchmark calculations still run live.
          </p>
        )}
      </div>
    </details>
  );
}
