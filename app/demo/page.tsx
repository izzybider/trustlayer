import { DemoClient } from "@/components/DemoClient";
import { FEATURED_SCENARIOS, SCENARIOS } from "@/lib/evaluation/scenarios";
import { TOOL_CATALOG } from "@/lib/tools";

export const metadata = {
  title: "Live decision demo — TrustLayer",
};

/**
 * The duplicate-charge refund is the default because it is the scenario that
 * explains the product: VERIFY is not a refusal, it is an evidence-gathering
 * state that can unlock a supported action.
 */
const DEFAULT_SCENARIO = "ev_001";

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const params = await searchParams;
  const requested = params.scenario;
  const initialScenarioId =
    requested && SCENARIOS.some((s) => s.id === requested) ? requested : DEFAULT_SCENARIO;

  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <div className="eyebrow">Live decision demo</div>
        <h1 className="mt-2">Watch the system decide before it responds</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          Every request is classified, scored against risk, evidence and authorization, and routed
          to one of four behaviors. Tools run only when the decision calls for them, and only from a
          fixed registry of {TOOL_CATALOG.length} simulated functions reading local fixtures.
        </p>
      </header>

      <DemoClient
        featured={FEATURED_SCENARIOS}
        scenarios={SCENARIOS}
        initialScenarioId={initialScenarioId}
      />
    </div>
  );
}
