import type { StructuredState } from "@/lib/schemas";

/**
 * Clarification wording.
 *
 * Both variants are produced deterministically from structured state so that the
 * explanation experiment compares one thing only: whether the question carries
 * the reason it is being asked. Nothing else about the two strings differs.
 */

export type ClarificationVariant = "A" | "B";

/** Deterministic so the two variants differ only in the explanation clause. */
export function clarificationText(
  state: StructuredState,
  variant: ClarificationVariant,
): string {
  const missing = state.missing_information[0] ?? "one more detail";
  if (variant === "A") {
    return `Please provide ${missing}.`;
  }
  const because =
    state.task_type === "refund_request"
      ? "before I can check whether the charge was duplicated"
      : state.task_type === "reservation_action"
        ? "so I cancel the right booking and not another one"
        : state.task_type === "account_action" || state.task_type === "access_control"
          ? "before I can confirm who is permitted to make this change"
          : state.task_type === "analysis"
            ? "so I can pull the right data rather than estimate"
            : "before I can complete this accurately";
  return `I need ${missing} ${because}. Once you share it, I can continue.`;
}

