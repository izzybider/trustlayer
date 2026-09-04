import type { SystemMetrics } from "@/lib/schemas";
import { SYSTEM_SHORT_LABELS } from "@/lib/evaluation/harness";

/**
 * Autonomy against unsupported behavior. Plotted only from metrics computed in
 * this session's runs; there is no stored or illustrative data behind it.
 */
export function TradeoffChart({ metrics }: { metrics: SystemMetrics[] }) {
  const W = 560;
  const H = 340;
  const PAD = { top: 20, right: 24, bottom: 44, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const x = (v: number) => PAD.left + v * plotW;
  const y = (v: number) => PAD.top + (1 - v) * plotH;

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <figure className="panel p-4">
      <figcaption className="mb-3">
        <div className="eyebrow">Primary tradeoff</div>
        <h3 className="mt-0.5 text-[14px]">Autonomy against unsupported behavior</h3>
        <p className="mt-1 text-[12px] text-muted">
          Right and down is better: more finished work, less of it unsupportable.
        </p>
      </figcaption>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[460px]"
          role="img"
          aria-label={`Scatter plot of autonomous completion against unsupported behavior. ${metrics
            .map(
              (m) =>
                `${SYSTEM_SHORT_LABELS[m.system]}: ${(m.autonomous_completion_rate * 100).toFixed(
                  0,
                )}% autonomous completion, ${(m.unsupported_behavior_rate * 100).toFixed(
                  0,
                )}% unsupported behavior.`,
            )
            .join(" ")}`}
        >
          <rect
            x={x(0.5)}
            y={y(0.5)}
            width={plotW / 2}
            height={plotH / 2}
            fill="#EAF0EB"
            opacity={0.7}
          />
          <text x={x(0.98)} y={y(0.03)} textAnchor="end" className="fill-[#456B52] text-[10px]">
            preferred region
          </text>

          {ticks.map((t) => (
            <g key={`gx-${t}`}>
              <line x1={x(t)} y1={PAD.top} x2={x(t)} y2={PAD.top + plotH} stroke="#E2DED5" />
              <text
                x={x(t)}
                y={PAD.top + plotH + 16}
                textAnchor="middle"
                className="fill-[#6E6C66] text-[10px]"
              >
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <g key={`gy-${t}`}>
              <line x1={PAD.left} y1={y(t)} x2={PAD.left + plotW} y2={y(t)} stroke="#E2DED5" />
              <text
                x={PAD.left - 8}
                y={y(t) + 3}
                textAnchor="end"
                className="fill-[#6E6C66] text-[10px]"
              >
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          <line
            x1={PAD.left}
            y1={PAD.top + plotH}
            x2={PAD.left + plotW}
            y2={PAD.top + plotH}
            stroke="#CFC9BC"
          />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#CFC9BC" />

          <text
            x={PAD.left + plotW / 2}
            y={H - 6}
            textAnchor="middle"
            className="fill-[#3F3F3D] text-[11px]"
          >
            Autonomous task completion
          </text>
          <text
            x={-(PAD.top + plotH / 2)}
            y={13}
            transform="rotate(-90)"
            textAnchor="middle"
            className="fill-[#3F3F3D] text-[11px]"
          >
            Unsupported behavior
          </text>

          {metrics.map((m) => {
            const cx = x(m.autonomous_completion_rate);
            const cy = y(m.unsupported_behavior_rate);
            const isTL = m.system === "trustlayer";
            return (
              <g key={m.system}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isTL ? 7 : 5.5}
                  fill={isTL ? "#3C5A78" : "#FFFDF9"}
                  stroke={isTL ? "#3C5A78" : "#6E6C66"}
                  strokeWidth={1.5}
                />
                <text
                  x={cx + (cx > PAD.left + plotW * 0.75 ? -12 : 12)}
                  y={cy + 4}
                  textAnchor={cx > PAD.left + plotW * 0.75 ? "end" : "start"}
                  className="fill-[#141414] text-[11px]"
                >
                  {SYSTEM_SHORT_LABELS[m.system]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
