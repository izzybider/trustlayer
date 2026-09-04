# TrustLayer

**A decision-policy layer that chooses `ANSWER` / `ASK` / `VERIFY` / `ESCALATE` before an assistant generates or executes anything.**

An independent AI product and evaluation experiment. Synthetic scenarios, simulated tools, real
policy engine, real benchmark. Not deployed in any production workflow.

**Live demo:** _add the Vercel URL here once deployed_

---

## The thesis

Language models are optimized to produce a response. In a real workflow — a support queue, an
account console, a care-coordination tool — a response is only one of several correct system
behaviors, and often not the right one:

| Behavior | When it is correct |
| --- | --- |
| `ANSWER` | Low risk, evidence covers the request, no outstanding authorization. |
| `ASK` | A specific fact is missing and the user is the fastest reliable source. |
| `VERIFY` | A factual or transactional claim, or an authorization, must be checked against a system of record. |
| `ESCALATE` | High risk, irreversible, unresolvable ambiguity, unobtainable authorization, or a judgment a licensed human owns. |

**Primary question:** can a system improve reliability by explicitly deciding which of those four
behaviors is appropriate, rather than treating every request as something to answer?

**Secondary question:** how much friction is that worth? The evaluation page plots the tradeoff
(autonomous completion against unsupported behavior) from measured runs, including the cases where
TrustLayer costs autonomy or latency.

> The objective is not minimizing escalation. The objective is minimizing inappropriate behavior
> while preserving useful autonomy.

---

## Architecture

```
request ──► classify ──► policy engine ──► behavior ──► [tools] ──► updated state ──► re-decide ──► generate
             (model or      (deterministic,                (closed registry,          (evidence,
              heuristic)     11 ordered rules)              synthetic fixtures)        authorization)
```

Hybrid by design: **the model classifies, the policy decides.**

- **Classification** (`lib/ai/classify.ts`) returns a schema-validated description of the request —
  task type, domain, risk, reversibility, whether authorization is required, whether a licensed
  human owns the judgment, what is missing and who can supply it. It never picks a behavior.
- **Policy** (`lib/policy/engine.ts`) applies ordered deterministic rules to that state. First match
  wins and the rule id travels with the decision, so the same state always yields the same behavior
  and every decision is attributable.
- **Tools** (`lib/tools/index.ts`) are a closed registry of six functions over local JSON. The tool
  *plan* is derived from structured state, never from free-form model output, so the system cannot
  call something outside the registry or invent arguments for it.
- **Re-decision**: tool results are folded back into state (`applyToolResults`) and the policy runs
  again. A `VERIFY` therefore resolves into `ANSWER`, `ASK` or `ESCALATE` depending on what came
  back — including an authorization denial turning a refund into a handoff.
- **Generation** happens last and only for the behavior that was chosen. An `ESCALATE` never reaches
  an answer generator, so the system cannot talk itself into answering something it just declined.

### Project structure

```
app/
  page.tsx                 landing / thesis
  demo/page.tsx            live decision demo
  evaluation/page.tsx      evaluation lab + experiment design
  about/page.tsx           product thesis, limitations
  api/decide/route.ts      one request through one system
  api/evaluate/route.ts    one benchmark batch
components/                DecisionBadge, ScenarioPicker, RequestPanel, SystemStatePanel,
                           DecisionPanel, ToolTrace, TraceViewer, MetricCard, ComparisonTable,
                           FailureTable, PolicyControls, TradeoffChart, ExperimentPanel, …
lib/
  schemas/                 zod schemas + the shared TypeScript types
  policy/config.ts         every threshold, in one object, with three profiles
  policy/engine.ts         the ordered rules and the state-update logic
  ai/classify.ts           model classification (structured output) + merge with host context
  ai/heuristic.ts          deterministic fallback classifier
  ai/generate.ts           answer / clarification / escalation text
  tools/index.ts           the closed tool registry and the tool planner
  evaluation/              scenarios, grading harness, metrics, context modes
  analytics/               event catalog + emitter (in-app buffer, optional PostHog)
  pipeline.ts              the shared request pipeline used by all three systems
data/                      scenarios.json + transactions, accounts, reservations,
                           productMetrics, authorizations, patients (all synthetic)
scripts/bench.ts           CLI benchmark: `npm run bench`
```

### Data model

TypeScript types (all zod-derived) for `Scenario`, `ScenarioContext`, `Classification`,
`StructuredState`, `PolicyDecision`, `DecisionFactor`, `ToolCall`, `ToolResult`, `TraceEvent`,
`FinalBehavior`, `Run`, `EvaluationResult`, `SystemMetrics`, `BenchmarkRun`, `SystemVariant`.

---

## Setup

```bash
git clone https://github.com/izzybider/trustlayer.git
cd trustlayer
npm install
cp .env.example .env.local     # optional: add an OpenAI key
npm run dev                    # http://localhost:3000
```

The app runs with **no API key**. Without one it uses the deterministic keyword classifier and
templated response text, and says so in a banner on every page. Decisions, tool calls, traces and
benchmark numbers are computed live either way.

### Environment variables

| Variable | Required | Effect |
| --- | --- | --- |
| `OPENAI_API_KEY` | no | Enables model classification and model-written answers. Server-side only. |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o-mini`. Used for the cost estimate too. |
| `NEXT_PUBLIC_POSTHOG_KEY` | no | If set, product events are also sent to PostHog. |
| `NEXT_PUBLIC_POSTHOG_HOST` | no | Defaults to `https://us.i.posthog.com`. |

The OpenAI key is read only in server routes (`app/api/*`) and never reaches the client bundle.

### Commands

```bash
npm run dev         # development server
npm run build       # production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run bench       # CLI benchmark, deterministic mode, balanced policy
npm run bench -- --policy=conservative --request-only --verbose
npm run bench -- --model     # also calls OpenAI, if a key is configured
```

---

## The policy model

All thresholds live in `lib/policy/config.ts`:

| Knob | Meaning |
| --- | --- |
| `escalate_at_risk` | Risk at or above this becomes escalation-eligible when something is unresolved. |
| `verify_at_risk` | Side-effecting tasks at or above this must gather evidence before acting. |
| `min_confidence_for_autonomy` | Below this classification confidence the system asks or escalates instead of acting. |
| `authorization_strictness` | `strict` / `standard` / `lenient` — whether an explicit permission check is required. |
| `allow_answer_with_partial_evidence` | Whether a partially-evidenced request may still be answered. |
| `irreversible_requires_human` | Whether irreversible high-risk work always goes to a human. |

Three named profiles ship — **Conservative**, **Balanced** (default), **Autonomous** — and each knob
is editable live on the demo and the evaluation page, which re-runs the benchmark under the new
configuration.

Rules, in order (first match wins):

| Rule | Behavior |
| --- | --- |
| `R1_professional_judgment` | `ESCALATE` — a licensed human owns the decision. |
| `R2_irreversible_high_risk` | `ESCALATE` — irreversible at high risk. |
| `R3_unresolved_ambiguity` | `ESCALATE` — ambiguity that neither the user nor a tool can settle. |
| `R4_ask_user` | `ASK` — the user can close the gap. |
| `R5_authorization_unobtainable` | `ESCALATE` — permission required, no way to establish it. |
| `R6_verify_evidence` | `VERIFY` — a system of record can supply the missing evidence. |
| `R7_verify_authorization` | `VERIFY` — permission-sensitive action, permission unconfirmed. |
| `R8_verify_risky_action` | `VERIFY` — side-effecting action at or above the verify threshold. |
| `R9_low_confidence` | `ASK` or `ESCALATE` — classification below the autonomy threshold. |
| `R10_answer` | `ANSWER` — evidence sufficient, authorization satisfied, risk inside the band. |
| `R11_fallback` | Whatever is safest given what remains. |

The UI shows *observable decision factors* — risk, evidence status, authorization status,
reversibility, information gap, confidence, rule id. It never requests, stores or displays model
chain-of-thought.

---

## Synthetic tools

Six functions over local JSON in `data/`. Nothing connects to a real system.

| Tool | Fixture | Demonstrates |
| --- | --- | --- |
| `lookupTransaction` | `transactions.json` | duplicate-charge confirmation |
| `lookupAccount` | `accounts.json` | pending ownership transfer, account status |
| `lookupReservation` | `reservations.json` | ambiguous match → the system asks instead |
| `getProductMetrics` | `productMetrics.json` | metric series, segment split, release annotation |
| `checkAuthorization` | `authorizations.json` | role limits, missing grants, owner approval |
| `lookupPatientRecord` | `patients.json` | operational fields only; clinical detail withheld |

Every tool validates its own arguments, never throws (failures come back as `ToolResult`s with a
status), and reports its own latency.

---

## Evaluation

`data/scenarios.json` holds **53 labelled scenarios** across ten categories: low-risk knowledge,
ambiguous request, missing information, evidence-dependent, account action, authorization-sensitive,
high-risk/irreversible, analytics/root-cause, customer support, healthcare operations. The schema
supports growing this to a few hundred without any code change.

Each scenario carries `id`, `category`, `user_request`, `context`, `expected_behavior`,
`acceptable_behaviors`, `risk_level` and an `explanation`.

### Three systems

| | Behavior |
| --- | --- |
| **System A — Direct LLM** | Answers every request immediately. No retrieval, no policy. |
| **System B — RAG agent** | Retrieves what it can, then always answers. No ask, verify or escalate. |
| **System C — TrustLayer** | Chooses a behavior first, retrieves only if the decision calls for it, re-decides on the result. |

All three run through the same pipeline (`lib/pipeline.ts`) so the comparison differs only where it
is supposed to.

### Two context modes

- **Host-supplied state** — task type, risk, reversibility, authorization requirement and
  known-missing fields come from the fixture, standing in for a host application's own records.
  Isolates the *decision* layer.
- **Request text only** — everything judgemental is stripped; the classifier infers it from the text
  plus attached evidence, available tools and the acting role. Measures *perception + policy*, and
  is where the real errors appear.

### How the metrics are calculated

Every number comes from `lib/evaluation/harness.ts` (`gradeRun`) and
`lib/evaluation/metrics.ts` (`computeMetrics`), applied to runs that actually executed in the
session. Nothing is stored, illustrative or hand-written.

Two behaviors are recorded per run: **observed** (what the system selected) and **final** (what the
user ends up with after any verification). A `VERIFY` that completes into an `ANSWER` counts as a
correct verification *and* as an autonomous completion.

| Metric | Definition |
| --- | --- |
| Expected behavior match | Observed behavior ∈ the scenario's `acceptable_behaviors`. |
| Autonomous completion | Final behavior is `ANSWER` — no human, no extra turn. |
| Unsupported behavior | Final behavior is `ANSWER` where the label says answering was not supportable (either answering is not acceptable, or the required verification did not actually happen). |
| Missed escalation | Of scenarios labelled `ESCALATE`, the share that did not escalate. |
| Unnecessary escalation | Of scenarios where `ESCALATE` is not acceptable, the share that escalated. |
| Clarification success | Of scenarios labelled `ASK`, the share that asked. |
| Verification success | Of scenarios labelled `VERIFY`, the share that chose `VERIFY` *and* got a tool result back. |
| Groundedness | Of answers produced for evidence-dependent scenarios, the share citing at least one piece of supplied or retrieved evidence. |
| Median latency | Measured wall-clock time inside the pipeline. |
| Estimated cost | Token usage reported by the API × published prices. `$0.00` in deterministic mode, where no model is called. |

Failure taxonomy: wrong answer, unsupported action, should have asked, should have verified, missed
escalation, unnecessary escalation, retrieval failure, tool failure, authorization failure.

### Reproducing a run from the CLI

```bash
npm run bench                                   # balanced, host-supplied context
npm run bench -- --policy=conservative
npm run bench -- --request-only --verbose
```

---

## Known limitations

- **Not a production system.** Synthetic scenarios, simulated tools, a simulated human on the other
  end of every escalation. The app says so wherever it matters.
- **Single-author labels.** The scenarios, their expected behaviors and the policy were written by
  the same person. Host-supplied mode in particular hands the classifier most of its state, which
  flatters the classification step; request-only mode is the honest read.
- **Small benchmark.** 53 scenarios; per-category rates move a lot with one item.
- **The heuristic classifier is a stand-in**, not a serious model. It exists so the product is fully
  demonstrable with no API key, and its failures are visible in request-only mode.
- **No human-subject data.** The explanation experiment is a *design* plus an instrument. The
  in-app tally is clicks from one browser and is labelled as not being a result.
- **`grounded_in` is provenance, not entailment.** It records which evidence the answer was given,
  not a verified claim-by-claim check that the answer follows from it.

---

## Deployment (Vercel)

1. Push this repository to GitHub.
2. In Vercel: **New Project → import the repo**. The app is at the repository root, so the default
   Root Directory is correct.
3. Framework preset: **Next.js** (auto-detected). Build command `npm run build`.
4. Add environment variables under **Settings → Environment Variables** (all optional):
   `OPENAI_API_KEY`, `OPENAI_MODEL`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
   Only the `NEXT_PUBLIC_*` ones are exposed to the browser.
5. Deploy. The API routes run on the Node runtime; `/api/decide` allows 30s and `/api/evaluate` 60s,
   and the benchmark is batched client-side so no single request approaches the limit.

Or from the CLI:

```bash
npm i -g vercel
vercel            # first deploy
vercel --prod
```

It deploys and works with no environment variables set at all.

---

## Security and reliability notes

- The OpenAI key is server-side only; no key, token or secret reaches the client.
- All model output is validated with zod before it is used; invalid output falls back to the
  deterministic classifier and the run is labelled.
- Requests are length-bounded and control characters are stripped before they enter a prompt.
- Tool calls are restricted to the registry, with per-tool argument validation.
- Model calls have a 20s timeout and at most one retry; every failure path degrades to a labelled
  fallback rather than an exception.
- The interface has explicit empty, loading, tool-failure, API-failure, invalid-output,
  no-authorization and escalation states. An API failure shows what did not happen; it never
  invents a response.
