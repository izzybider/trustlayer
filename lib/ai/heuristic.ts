import { SIDE_EFFECTING_TASKS as SIDE_EFFECTING_TASK_TYPES } from "@/lib/policy/config";
import type {
  Classification,
  Domain,
  EvidenceStatus,
  InformationGap,
  RiskLevel,
  ScenarioContext,
  Reversibility,
  TaskType,
} from "@/lib/schemas";

/**
 * Deterministic classifier.
 *
 * Used when no OPENAI_API_KEY is configured, and as the fallback whenever the
 * model call fails, times out, or returns output that does not validate. It is
 * keyword-based and deliberately simple: its job is to keep the product
 * demonstrable offline, not to be a good classifier.
 */

const TASK_PATTERNS: { task: TaskType; domain: Domain; re: RegExp }[] = [
  {
    task: "informational",
    domain: "general",
    re: /^\s*(summar\w+|explain|what (is|does|do)\b|how (do|does) .*work|draft |list the|describe )/i,
  },
  {
    task: "clinical_judgment",
    domain: "healthcare",
    re: /\b(medication|dose|dosage|prescri\w+|diagnos\w+|symptom|taper|contraindicat\w+|\d+\s?(mg|mcg|ml|units)\b|patient (should|needs|can))\b/i,
  },
  {
    task: "refund_request",
    domain: "commerce",
    re: /\b(refund (this|the|a|my|them|him|her)|issue a refund|charged twice|duplicate charge|chargeback|refund \$?\d)/i,
  },
  { task: "reservation_action", domain: "commerce", re: /\b(reservation|booking|book a table)\b/i },
  {
    task: "access_control",
    domain: "identity",
    re: /\b(owner|ownership|admin access|grant admin|permission|mfa|2fa|password reset|transfer the account|sso|revoke .*access)\b/i,
  },
  {
    task: "account_action",
    domain: "identity",
    re: /\b(close|delete|downgrade|upgrade|suspend|merge|rename|add) (all |three |\d+ )?(my |the |this )?(account|workspace|org|seats?|plan|customer data)\b/i,
  },
  {
    task: "healthcare_operations",
    domain: "healthcare",
    re: /\b(appointment|clinic|care task|referral|patient record|intake form|discharge paperwork)\b/i,
  },
  {
    task: "legal_judgment",
    domain: "legal",
    re: /\b(sue|lawsuit|liable|liability|contract enforceable|legal advice|nda)\b/i,
  },
  {
    task: "financial_advice",
    domain: "finance",
    re: /\b(invest|portfolio|stock|retirement|tax deduction|should i buy)\b/i,
  },
  {
    task: "analysis",
    domain: "analytics",
    re: /\b(why (did|is|are)|root cause|what caused|drop|fell|declin\w+|spike|conversion|retention|funnel|metric|dashboard|anomal\w+|signups?)\b/i,
  },
  {
    task: "support_action",
    domain: "support",
    re: /\b(escalate|ticket|case|reopen|apolog\w+|credit|waive|discount|order|customer)\b/i,
  },
  { task: "informational", domain: "general", re: /\b(summar\w+|explain|overview|what is|what does)\b/i },
];

/** Destructive verbs dominate whatever else the text looks like. */
const DESTRUCTIVE_RE =
  /\b(delete|wipe|erase|purge|revoke|terminate|deactivate|permanently remove|permanently delete)\b|\bcancel (the |this )?(annual )?contract\b/i;

/** Rough check for whether the request names a specific record at all. */
const IDENTIFIER_RE = /([a-z]+_\d+|\b\d{3,}\b|@[\w.]+|\b[A-Z][a-z]+ [A-Z][a-z]+\b|\b[A-Z][a-z]+ (Retail|Studio|Coffee|Club|Tavern)\b)/;

const DEFAULT_RISK: Record<TaskType, RiskLevel> = {
  informational: "low",
  analysis: "low",
  reservation_action: "low",
  refund_request: "medium",
  account_action: "medium",
  access_control: "high",
  clinical_judgment: "high",
  healthcare_operations: "medium",
  legal_judgment: "high",
  financial_advice: "high",
  support_action: "medium",
  other: "medium",
};

const DEFAULT_REVERSIBILITY: Record<TaskType, Reversibility> = {
  informational: "reversible",
  analysis: "reversible",
  reservation_action: "partially_reversible",
  refund_request: "partially_reversible",
  account_action: "partially_reversible",
  access_control: "irreversible",
  clinical_judgment: "irreversible",
  healthcare_operations: "reversible",
  legal_judgment: "irreversible",
  financial_advice: "partially_reversible",
  support_action: "reversible",
  other: "partially_reversible",
};

const DEFAULT_AUTH_REQUIRED: Record<TaskType, boolean> = {
  informational: false,
  analysis: false,
  reservation_action: false,
  refund_request: true,
  account_action: true,
  access_control: true,
  clinical_judgment: true,
  healthcare_operations: true,
  legal_judgment: false,
  financial_advice: false,
  support_action: false,
  other: false,
};

const PROFESSIONAL_JUDGMENT_RE =
  /\b(which medication|should (this|the) patient|stop (taking|the) \w+|diagnos\w+|prescri\w+|dosage|taper|should (i|we|they) sue|is this (contract )?enforceable|legal advice|should (i|we) invest|medical advice|treatment plan)\b/i;

const VERIFICATION_GAP_RE =
  /(confirmation|verif\w*|record|history|permission|authoriz\w*|entitlement|status|ledger|log|metric|data|balance|eligibility|whether|breakdown|segment)/i;

const USER_GAP_RE =
  /(which|what date|preferred|name|email|phone|number|id\b|_id|identifier|reason|time|party size|choice|selection|confirmation code)/i;

const UNRESOLVED_GAP_RE =
  /(intent|clinical rationale|professional judgment|unknowable|not recorded|no source|cannot be determined|context we do not have)/i;

export function deriveEvidenceStatus(
  available: string[],
  missing: string[],
): EvidenceStatus {
  if (missing.length === 0) return "sufficient";
  if (available.length === 0) return "insufficient";
  return "partially_sufficient";
}

export function deriveInformationGap(
  missing: string[],
  toolAvailable: boolean,
): InformationGap {
  if (missing.length === 0) return "none";
  if (missing.some((m) => UNRESOLVED_GAP_RE.test(m))) return "unresolved";
  const verifiable = missing.some((m) => VERIFICATION_GAP_RE.test(m));
  if (toolAvailable && verifiable) return "resolvable_by_verification";
  if (missing.some((m) => USER_GAP_RE.test(m))) return "resolvable_by_user";
  if (toolAvailable) return "resolvable_by_verification";
  return "resolvable_by_user";
}

export function heuristicClassify(
  userRequest: string,
  context: ScenarioContext,
): Classification {
  const text = userRequest.slice(0, 2000);
  const match = TASK_PATTERNS.find((p) => p.re.test(text));
  const destructive = DESTRUCTIVE_RE.test(text);

  const task_type: TaskType = context.task_type ?? match?.task ?? "other";
  const domain: Domain = context.domain ?? match?.domain ?? "general";
  const risk_level: RiskLevel =
    context.risk_level ?? (destructive ? "high" : DEFAULT_RISK[task_type]);
  const reversible: Reversibility =
    context.reversible ?? (destructive ? "irreversible" : DEFAULT_REVERSIBILITY[task_type]);
  const authorization_required =
    context.authorization_required ?? (destructive || DEFAULT_AUTH_REQUIRED[task_type]);

  const requires_professional_judgment =
    task_type === "clinical_judgment" ||
    task_type === "legal_judgment" ||
    task_type === "financial_advice" ||
    PROFESSIONAL_JUDGMENT_RE.test(text);

  const available_evidence = context.available_evidence ?? [];
  const tool_available = context.tool_available ?? false;

  /* Infer what is missing when the host system did not report it. */
  let missing_information = context.missing_information ?? [];
  if (missing_information.length === 0 && !requires_professional_judgment && !destructive) {
    const sideEffecting = SIDE_EFFECTING_TASK_TYPES.has(task_type);
    if (sideEffecting && !IDENTIFIER_RE.test(text)) {
      missing_information = ["which record this request applies to"];
    } else if (task_type === "analysis" && available_evidence.length === 0) {
      missing_information = tool_available
        ? ["the underlying metric data for this question"]
        : ["metric data that is not instrumented anywhere we can query"];
    } else if (tool_available && available_evidence.length === 0) {
      missing_information = ["the current record from the system of record"];
    }
  }

  const evidence_status = deriveEvidenceStatus(available_evidence, missing_information);
  const information_gap = deriveInformationGap(missing_information, tool_available);

  /* Confidence reflects how much of the state came from the host system versus
     keyword matching on raw text. */
  const contextPinned = [
    context.task_type,
    context.risk_level,
    context.authorization_required,
    context.reversible,
  ].filter((v) => v !== undefined).length;
  let confidence = 0.45;
  if (match) confidence = 0.72;
  if (destructive || requires_professional_judgment) confidence = Math.max(confidence, 0.8);
  confidence = Math.min(0.93, confidence + contextPinned * 0.055);

  const rationale = destructive
    ? "Matched a destructive-action pattern, so risk and reversibility were raised regardless of the surface task type."
    : match
      ? `Matched the ${task_type.replace(/_/g, " ")} pattern; ${
          contextPinned > 0
            ? "risk and reversibility taken from host context"
            : "risk defaulted by task type"
        }.`
      : "No task pattern matched; classified as a generic request with default risk.";

  return {
    task_type,
    domain,
    risk_level,
    reversible,
    authorization_required,
    requires_professional_judgment,
    missing_information,
    information_gap,
    evidence_status,
    rationale,
    confidence,
  };
}
