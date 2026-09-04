/**
 * Offline benchmark runner.
 *
 *   npm run bench                    deterministic mode, balanced policy
 *   npm run bench -- --policy=conservative
 *   npm run bench -- --model        also calls the API if OPENAI_API_KEY is set
 *
 * Prints the same numbers the Evaluation Lab shows, computed the same way.
 */
import { SCENARIOS } from "@/lib/evaluation/scenarios";
import { gradeRun, SYSTEM_SHORT_LABELS } from "@/lib/evaluation/harness";
import { computeMetrics } from "@/lib/evaluation/metrics";
import { runSystem } from "@/lib/pipeline";
import { POLICY_PROFILES, type PolicyProfile } from "@/lib/policy/config";
import { contextFor, type ContextMode } from "@/lib/evaluation/context";
import type { EvaluationResult, SystemVariant } from "@/lib/schemas";

const args = process.argv.slice(2);
const profileArg = (args.find((a) => a.startsWith("--policy="))?.split("=")[1] ??
  "balanced") as PolicyProfile;
const useModel = args.includes("--model");
const verbose = args.includes("--verbose");
const contextMode: ContextMode = args.includes("--request-only")
  ? "request_only"
  : "system_provided";
const policy = POLICY_PROFILES[profileArg] ?? POLICY_PROFILES.balanced;
const systems: SystemVariant[] = ["direct_llm", "rag_agent", "trustlayer"];

async function main() {
  const results: EvaluationResult[] = [];
  for (const system of systems) {
    for (const scenario of SCENARIOS) {
      const run = await runSystem(
        system,
        {
          user_request: scenario.user_request,
          context: contextFor(scenario, contextMode),
          scenario_id: scenario.id,
        },
        { policy, useModel },
      );
      results.push(gradeRun(scenario, run));
    }
  }

  console.log(`\nscenarios: ${SCENARIOS.length}  policy: ${policy.label}  mode: ${useModel ? "model" : "deterministic"}  context: ${contextMode}\n`);
  const pct = (v: number | null) => (v === null ? "  n/a" : `${(v * 100).toFixed(0).padStart(4)}%`);
  console.log(
    ["system".padEnd(12), "match", "auton", "unsup", "missEsc", "unnecEsc", "ask", "verify", "ground"].join("  "),
  );
  for (const system of systems) {
    const m = computeMetrics(system, results);
    console.log(
      [
        SYSTEM_SHORT_LABELS[system].padEnd(12),
        pct(m.behavior_match_rate),
        pct(m.autonomous_completion_rate),
        pct(m.unsupported_behavior_rate),
        pct(m.missed_escalation_rate),
        pct(m.unnecessary_escalation_rate),
        pct(m.clarification_success_rate),
        pct(m.verification_success_rate),
        pct(m.groundedness_rate),
      ].join("  "),
    );
  }

  const tl = results.filter((r) => r.system === "trustlayer" && !r.behavior_match);
  console.log(`\nTrustLayer mismatches (${tl.length}):`);
  for (const r of tl) {
    console.log(`  ${r.scenario_id.padEnd(11)} expected ${r.expected_behavior.padEnd(8)} got ${r.note}`);
  }
  if (verbose) {
    console.log("\nAll TrustLayer rows:");
    for (const r of results.filter((r) => r.system === "trustlayer")) {
      console.log(
        `  ${r.scenario_id.padEnd(11)} ${r.expected_behavior.padEnd(8)} -> ${r.note.padEnd(28)} ${r.failures.join(",")}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
