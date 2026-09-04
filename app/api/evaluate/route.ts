import { NextResponse } from "next/server";
import { z } from "zod";
import { runSystem } from "@/lib/pipeline";
import { resolvePolicy } from "@/lib/policy/config";
import { SystemVariantSchema } from "@/lib/schemas";
import { getScenario } from "@/lib/evaluation/scenarios";
import { gradeRun } from "@/lib/evaluation/harness";
import { contextFor } from "@/lib/evaluation/context";
import { modelEnabled } from "@/lib/ai/client";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Runs one batch of scenarios for one system. The client drives the batching so
 * the benchmark streams into the UI and no single request runs long enough to
 * hit a serverless timeout.
 */
const BodySchema = z.object({
  system: SystemVariantSchema,
  scenario_ids: z.array(z.string().max(64)).min(1).max(12),
  policy: z.unknown().optional(),
  context_mode: z.enum(["system_provided", "request_only"]).default("system_provided"),
  use_model: z.boolean().default(false),
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

  const { system, scenario_ids, policy, context_mode, use_model } = parsed.data;
  const resolved = resolvePolicy(policy);
  const useModel = use_model && modelEnabled();

  try {
    const results = [];
    const notes: string[] = [];
    for (const id of scenario_ids) {
      const scenario = getScenario(id);
      if (!scenario) {
        notes.push(`Unknown scenario id "${id}" was skipped.`);
        continue;
      }
      const run = await runSystem(
        system,
        {
          user_request: scenario.user_request,
          context: contextFor(scenario, context_mode),
          scenario_id: scenario.id,
        },
        { policy: resolved, useModel },
      );
      results.push(gradeRun(scenario, run));
      notes.push(...run.warnings);
    }
    return NextResponse.json({ results, notes: Array.from(new Set(notes)).slice(0, 5) });
  } catch (err) {
    console.error("evaluate route failed", err);
    return NextResponse.json(
      { error: "The benchmark batch failed. Partial results were discarded." },
      { status: 500 },
    );
  }
}
