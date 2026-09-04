import { NextResponse } from "next/server";
import { z } from "zod";
import { runSystem } from "@/lib/pipeline";
import { resolvePolicy } from "@/lib/policy/config";
import { ScenarioContextSchema, SystemVariantSchema } from "@/lib/schemas";
import { getScenario } from "@/lib/evaluation/scenarios";
import { modelEnabled } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 30;

const BodySchema = z.object({
  user_request: z.string().trim().min(1).max(600),
  scenario_id: z.string().max(64).optional(),
  context: ScenarioContextSchema.optional(),
  policy: z.unknown().optional(),
  system: SystemVariantSchema.default("trustlayer"),
  clarification_variant: z.enum(["A", "B"]).default("B"),
  force_behavior: z.enum(["ANSWER", "ASK", "VERIFY", "ESCALATE"]).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid request: ${parsed.error.issues.map((i) => i.message).join("; ")}` },
      { status: 400 },
    );
  }

  const {
    user_request,
    scenario_id,
    context,
    policy,
    system,
    clarification_variant,
    force_behavior,
  } = parsed.data;
  const scenario = scenario_id ? getScenario(scenario_id) : undefined;
  const resolvedContext = context ?? scenario?.context ?? { available_evidence: [], missing_information: [] };

  try {
    const run = await runSystem(
      system,
      { user_request, context: resolvedContext, scenario_id: scenario?.id },
      {
        policy: resolvePolicy(policy),
        useModel: modelEnabled(),
        clarificationVariant: clarification_variant,
        forceBehavior: force_behavior,
      },
    );
    return NextResponse.json({ run });
  } catch (err) {
    console.error("decide route failed", err);
    return NextResponse.json(
      {
        error:
          "The decision pipeline failed unexpectedly. Nothing was executed and no answer was produced.",
      },
      { status: 500 },
    );
  }
}
