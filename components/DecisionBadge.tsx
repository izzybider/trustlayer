import type { Behavior } from "@/lib/schemas";

const STYLES: Record<Behavior, { bg: string; text: string; border: string; gloss: string }> = {
  ANSWER: {
    bg: "bg-ok-soft",
    text: "text-ok",
    border: "border-ok/35",
    gloss: "Respond directly from supported evidence",
  },
  ASK: {
    bg: "bg-accent-soft",
    text: "text-accent",
    border: "border-accent/35",
    gloss: "Pause for one clarifying question",
  },
  VERIFY: {
    bg: "bg-warn-soft",
    text: "text-warn",
    border: "border-warn/35",
    gloss: "Check a system of record before acting",
  },
  ESCALATE: {
    bg: "bg-danger-soft",
    text: "text-danger",
    border: "border-danger/35",
    gloss: "Hand off to a human",
  },
};

export function DecisionBadge({
  behavior,
  size = "md",
  showGloss = false,
}: {
  behavior: Behavior;
  size?: "sm" | "md" | "lg";
  showGloss?: boolean;
}) {
  const s = STYLES[behavior];
  const sizing =
    size === "lg"
      ? "px-3 py-1.5 text-[15px] tracking-[0.12em]"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[10px] tracking-[0.1em]"
        : "px-2 py-1 text-[11.5px] tracking-[0.12em]";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center border font-mono font-medium uppercase ${s.bg} ${s.text} ${s.border} ${sizing}`}
      >
        {behavior}
      </span>
      {showGloss && <span className="text-[12px] text-muted">{s.gloss}</span>}
    </span>
  );
}

export function decisionGloss(behavior: Behavior) {
  return STYLES[behavior].gloss;
}
