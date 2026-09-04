export function ModeBanner({
  modelEnabled,
  model,
}: {
  modelEnabled: boolean;
  model: string;
}) {
  return (
    <div className="border-b border-line bg-white/60">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2 text-[12px] text-muted">
        <span
          aria-hidden
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            modelEnabled ? "bg-ok" : "bg-line-strong"
          }`}
        />
        {modelEnabled ? (
          <span>
            <span className="text-ink">Model classification on</span> · classification and answer
            text come from <span className="font-mono">{model}</span>; the decision itself is always
            deterministic policy.
          </span>
        ) : (
          <span>
            <span className="text-ink">Deterministic mode</span> · no{" "}
            <span className="font-mono">OPENAI_API_KEY</span> is configured, so the keyword
            classifier and templated text stand in for the model. Every decision, tool call and
            benchmark number below is still computed live.
          </span>
        )}
      </div>
    </div>
  );
}
