import { DemoClient } from "@/components/DemoClient";
import { FEATURED_SCENARIOS, SCENARIOS } from "@/lib/evaluation/scenarios";
import { TOOL_CATALOG } from "@/lib/tools";

export const metadata = {
  title: "Live decision demo — TrustLayer",
};

export default function DemoPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <div className="eyebrow">Live decision demo</div>
        <h1 className="mt-2">Watch the system decide before it responds</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          Every request is classified, scored against risk, evidence and authorization, and routed to
          one of four behaviors. Tools run only when the decision calls for them, and only from a
          fixed registry of {TOOL_CATALOG.length} synthetic functions.
        </p>
      </header>

      <DemoClient featured={FEATURED_SCENARIOS} scenarios={SCENARIOS} />
    </div>
  );
}
