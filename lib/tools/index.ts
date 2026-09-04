import { z } from "zod";
import transactions from "@/data/transactions.json";
import accounts from "@/data/accounts.json";
import reservations from "@/data/reservations.json";
import productMetrics from "@/data/productMetrics.json";
import authorizations from "@/data/authorizations.json";
import patients from "@/data/patients.json";
import type { StructuredState, ToolCall, ToolResult, ToolName } from "@/lib/schemas";

/**
 * Synthetic tool layer.
 *
 * Every tool reads local JSON fixtures. Nothing here touches a real payment,
 * identity, analytics or clinical system. The registry is closed: only the
 * six functions below can be invoked, and each validates its own arguments.
 */

type ToolHandler = {
  name: ToolName;
  description: string;
  dataSource: string;
  args: z.ZodType<Record<string, string>>;
  run: (args: Record<string, string>) => Omit<ToolResult, "call_id" | "tool" | "latency_ms">;
};

const nonEmpty = (field: string) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`)
    .max(64)
    .regex(/^[A-Za-z0-9_\-. @:]+$/, `${field} contains unsupported characters`);

const lookupTransaction: ToolHandler = {
  name: "lookupTransaction",
  description: "Read a transaction record and check for a duplicate charge.",
  dataSource: "Payments ledger (synthetic)",
  args: z.object({ transaction_id: nonEmpty("transaction_id") }),
  run: ({ transaction_id }) => {
    const tx = transactions.find((t) => t.transaction_id === transaction_id);
    if (!tx) {
      return {
        status: "not_found",
        summary: `No transaction matching ${transaction_id}.`,
        data: { transaction_id },
      };
    }
    const siblings = transactions.filter(
      (t) =>
        t.duplicate_group &&
        t.duplicate_group === tx.duplicate_group &&
        t.transaction_id !== tx.transaction_id,
    );
    const duplicate = siblings.length > 0;
    return {
      status: "ok",
      summary: duplicate
        ? `Duplicate charge confirmed: ${tx.transaction_id} and ${siblings[0].transaction_id}, $${tx.amount_usd} each, 38 seconds apart.`
        : `Transaction ${tx.transaction_id} found. No duplicate charge in the same settlement group.`,
      data: { transaction: tx, duplicates: siblings, duplicate_confirmed: duplicate },
    };
  },
};

const lookupAccount: ToolHandler = {
  name: "lookupAccount",
  description: "Read an account record, including any pending ownership transfer.",
  dataSource: "Account directory (synthetic)",
  args: z.object({ account_id: nonEmpty("account_id") }),
  run: ({ account_id }) => {
    const account = accounts.find((a) => a.account_id === account_id);
    if (!account) {
      return {
        status: "not_found",
        summary: `No account matching ${account_id}.`,
        data: { account_id },
      };
    }
    const pending = account.pending_owner_transfer;
    return {
      status: "ok",
      summary: pending
        ? `Account ${account.account_id} found. Ownership transfer requested by ${pending.requested_by}; current owner has not approved.`
        : `Account ${account.account_id} found. Owner ${account.owner}, status ${account.status}.`,
      data: account,
    };
  },
};

const lookupReservation: ToolHandler = {
  name: "lookupReservation",
  description: "Look up reservations by reservation id or guest name.",
  dataSource: "Reservation book (synthetic)",
  args: z
    .object({
      reservation_id: nonEmpty("reservation_id").optional(),
      guest: nonEmpty("guest").optional(),
    })
    .refine((v) => v.reservation_id || v.guest, {
      message: "reservation_id or guest is required",
    }) as unknown as z.ZodType<Record<string, string>>,
  run: (args) => {
    if (args.reservation_id) {
      const res = reservations.find((r) => r.reservation_id === args.reservation_id);
      if (!res) {
        return {
          status: "not_found",
          summary: `No reservation matching ${args.reservation_id}.`,
          data: { reservation_id: args.reservation_id },
        };
      }
      return {
        status: "ok",
        summary: `${res.restaurant}, ${res.date} at ${res.time}, party of ${res.party_size}.`,
        data: res,
      };
    }
    const matches = reservations.filter(
      (r) => r.guest.toLowerCase() === String(args.guest).toLowerCase(),
    );
    if (matches.length === 0) {
      return {
        status: "not_found",
        summary: `No reservations found for ${args.guest}.`,
        data: { guest: args.guest },
      };
    }
    return {
      status: "ok",
      summary:
        matches.length === 1
          ? `One reservation: ${matches[0].restaurant}, ${matches[0].date} at ${matches[0].time}.`
          : `${matches.length} upcoming reservations found — the request does not identify which one.`,
      data: { matches, ambiguous: matches.length > 1 },
    };
  },
};

const getProductMetrics: ToolHandler = {
  name: "getProductMetrics",
  description: "Read a product metric series, segment split and release annotations.",
  dataSource: "Product analytics warehouse (synthetic)",
  args: z.object({
    metric: nonEmpty("metric"),
    date: nonEmpty("date").optional(),
  }) as unknown as z.ZodType<Record<string, string>>,
  run: (args) => {
    const metrics = productMetrics as Record<
      string,
      {
        unit: string;
        series: { date: string; value: number }[];
        segments: Record<string, { segment: string; value: number; prior: number }[]>;
        annotations: { date: string; note: string }[];
      }
    >;
    const metric = metrics[args.metric];
    if (!metric) {
      return {
        status: "not_found",
        summary: `No metric named ${args.metric}. Available: ${Object.keys(metrics).join(", ")}.`,
        data: { available: Object.keys(metrics) },
      };
    }
    const date = args.date ?? metric.series[metric.series.length - 1].date;
    const point = metric.series.find((p) => p.date === date);
    if (!point) {
      return {
        status: "not_found",
        summary: `No ${args.metric} data for ${date}.`,
        data: { available_dates: metric.series.map((p) => p.date) },
      };
    }
    const idx = metric.series.findIndex((p) => p.date === date);
    const prior = idx > 0 ? metric.series[idx - 1] : null;
    const segments = metric.segments[date] ?? [];
    const annotations = metric.annotations.filter((a) => a.date === date);
    const delta = prior ? +(point.value - prior.value).toFixed(2) : null;
    return {
      status: "ok",
      summary: prior
        ? `${args.metric} on ${date}: ${point.value}${metric.unit === "percent" ? "%" : ""} (${
            delta! >= 0 ? "+" : ""
          }${delta} vs ${prior.date}).${
            segments.length ? ` Segment split retrieved (${segments.length} segments).` : ""
          }`
        : `${args.metric} on ${date}: ${point.value}.`,
      data: { metric: args.metric, date, point, prior, delta, segments, annotations },
    };
  },
};

const checkAuthorization: ToolHandler = {
  name: "checkAuthorization",
  description: "Check whether the acting role is permitted to perform an action.",
  dataSource: "Permission service (synthetic)",
  args: z.object({
    action: nonEmpty("action"),
    role: nonEmpty("role").optional(),
    amount_usd: z.string().optional(),
  }) as unknown as z.ZodType<Record<string, string>>,
  run: (args) => {
    const table = authorizations.roles as Record<
      string,
      Record<string, { allowed: boolean; limit_usd?: number; requires?: string; requires_owner_approval?: boolean }>
    >;
    const role = args.role ?? authorizations.default_role;
    const rolePerms = table[role];
    if (!rolePerms) {
      return {
        status: "error",
        summary: `Unknown role "${role}".`,
        data: { known_roles: Object.keys(table) },
      };
    }
    const perm = rolePerms[args.action];
    if (!perm) {
      return {
        status: "denied",
        summary: `Role ${role} has no grant covering "${args.action}".`,
        data: { role, action: args.action },
      };
    }
    if (!perm.allowed) {
      return {
        status: "denied",
        summary: `Role ${role} is not permitted to ${args.action}${
          perm.requires ? `; requires ${perm.requires}` : ""
        }.`,
        data: { role, action: args.action, ...perm },
      };
    }
    const amount = args.amount_usd ? Number(args.amount_usd) : null;
    if (amount !== null && perm.limit_usd !== undefined && amount > perm.limit_usd) {
      return {
        status: "denied",
        summary: `Role ${role} may ${args.action} up to $${perm.limit_usd}; $${amount} exceeds the limit.`,
        data: { role, action: args.action, limit_usd: perm.limit_usd, requested_usd: amount },
      };
    }
    return {
      status: "ok",
      summary: perm.requires_owner_approval
        ? `Role ${role} may ${args.action}, but current-owner approval is still required.`
        : `Role ${role} is authorized to ${args.action}${
            perm.limit_usd ? ` up to $${perm.limit_usd}` : ""
          }.`,
      data: { role, action: args.action, ...perm },
    };
  },
};

const lookupPatientRecord: ToolHandler = {
  name: "lookupPatientRecord",
  description: "Read non-clinical operational fields from a patient record.",
  dataSource: "Care operations record (synthetic, access-restricted)",
  args: z.object({ patient_id: nonEmpty("patient_id") }),
  run: ({ patient_id }) => {
    const patient = patients.find((p) => p.patient_id === patient_id);
    if (!patient) {
      return {
        status: "not_found",
        summary: `No patient record matching ${patient_id}.`,
        data: { patient_id },
      };
    }
    return {
      status: "ok",
      summary: `${patient.display_name}: ${patient.open_care_tasks.length} open care task(s). Clinical fields are access-restricted and are not returned to the assistant.`,
      data: {
        patient_id: patient.patient_id,
        display_name: patient.display_name,
        open_care_tasks: patient.open_care_tasks,
        care_team: patient.care_team,
        medication_count: patient.active_medications.length,
        clinical_detail: "withheld",
      },
    };
  },
};

export const TOOL_REGISTRY: Record<ToolName, ToolHandler> = {
  lookupTransaction,
  lookupAccount,
  lookupReservation,
  getProductMetrics,
  checkAuthorization,
  lookupPatientRecord,
};

export const TOOL_CATALOG = Object.values(TOOL_REGISTRY).map((t) => ({
  name: t.name,
  description: t.description,
  dataSource: t.dataSource,
}));

/** Executes one tool call. Never throws: failures come back as ToolResults. */
export function runTool(call: ToolCall): ToolResult {
  const started = Date.now();
  const handler = TOOL_REGISTRY[call.tool];
  if (!handler) {
    return {
      call_id: call.id,
      tool: call.tool,
      status: "error",
      summary: `Tool "${call.tool}" is not in the registry.`,
      latency_ms: Date.now() - started,
    };
  }
  const parsed = handler.args.safeParse(call.args);
  if (!parsed.success) {
    return {
      call_id: call.id,
      tool: call.tool,
      status: "error",
      summary: `Invalid arguments: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      latency_ms: Date.now() - started,
    };
  }
  try {
    const out = handler.run(parsed.data);
    return { call_id: call.id, tool: call.tool, ...out, latency_ms: Date.now() - started };
  } catch (err) {
    return {
      call_id: call.id,
      tool: call.tool,
      status: "error",
      summary: `Tool raised an unexpected error: ${(err as Error).message}`,
      latency_ms: Date.now() - started,
    };
  }
}

const TOOL_LABELS: Record<ToolName, string> = {
  lookupTransaction: "Payments ledger",
  lookupAccount: "Account directory",
  lookupReservation: "Reservation book",
  getProductMetrics: "Product analytics",
  checkAuthorization: "Permission service",
  lookupPatientRecord: "Care operations record",
};

/**
 * Deterministic tool plan. The plan is derived from structured state, not from
 * free-form model output, so the system can never call something outside the
 * registry or invent arguments for it.
 */
export function planToolCalls(state: StructuredState): ToolCall[] {
  const calls: ToolCall[] = [];
  const push = (tool: ToolName, args: Record<string, string>) =>
    calls.push({
      id: `call_${calls.length + 1}`,
      tool,
      args,
      label: TOOL_LABELS[tool],
    });

  const hinted = state.tool_hint as ToolName | undefined;
  if (hinted && TOOL_REGISTRY[hinted]) {
    push(hinted, state.tool_args ?? {});
  } else {
    switch (state.task_type) {
      case "refund_request":
        push("lookupTransaction", state.tool_args ?? {});
        break;
      case "reservation_action":
        push("lookupReservation", state.tool_args ?? {});
        break;
      case "account_action":
      case "access_control":
        push("lookupAccount", state.tool_args ?? {});
        break;
      case "analysis":
        push("getProductMetrics", state.tool_args ?? {});
        break;
      case "healthcare_operations":
        push("lookupPatientRecord", state.tool_args ?? {});
        break;
      default:
        break;
    }
  }

  if (state.authorization_required && !calls.some((c) => c.tool === "checkAuthorization")) {
    const action =
      state.tool_args?.action ??
      (state.task_type === "refund_request"
        ? "issue_refund"
        : state.task_type === "reservation_action"
          ? "cancel_reservation"
          : state.task_type === "account_action" || state.task_type === "access_control"
            ? "change_account_owner"
            : state.task_type === "healthcare_operations"
              ? "export_patient_record"
              : "issue_refund");
    push("checkAuthorization", {
      action,
      role: state.actor_role ?? "support_agent_l1",
      ...(state.tool_args?.amount_usd ? { amount_usd: state.tool_args.amount_usd } : {}),
    });
  }

  return calls;
}
