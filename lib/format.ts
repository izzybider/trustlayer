/** Latency display. Deterministic runs finish in well under a millisecond, and
 *  "0ms" reads as a broken measurement rather than a fast one. */
export function formatMs(value: number): string {
  if (value < 1) return "<1ms";
  if (value < 10) return `${value.toFixed(1)}ms`;
  return `${Math.round(value)}ms`;
}
