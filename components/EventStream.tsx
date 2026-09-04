"use client";

import { useSyncExternalStore } from "react";
import { getEvents, posthogConfigured, subscribe } from "@/lib/analytics/events";

const EMPTY: ReturnType<typeof getEvents> = [];

export function EventStream() {
  const events = useSyncExternalStore(subscribe, getEvents, () => EMPTY);

  return (
    <details className="panel">
      <summary className="panel-header text-[13px]">
        <div>
          <div className="eyebrow">Instrumentation</div>
          <h3 className="mt-0.5 text-[14px]">Product event stream</h3>
        </div>
        <span className="chip">{events.length} events</span>
      </summary>
      <div className="p-4">
        <p className="text-[12px] leading-relaxed text-muted">
          Events emitted by this session.{" "}
          {posthogConfigured()
            ? "A PostHog key is configured, so these are also sent to PostHog."
            : "No PostHog key is configured, so they stay in this in-app buffer."}
        </p>
        {events.length === 0 ? (
          <p className="mt-3 text-[12px] text-muted">Nothing emitted yet.</p>
        ) : (
          <ul className="mt-3 max-h-64 overflow-y-auto">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-3 border-b border-line/70 py-1.5 last:border-b-0"
              >
                <span className="font-mono text-[11.5px] text-ink">{e.name}</span>
                <span className="truncate font-mono text-[11px] text-muted">
                  {Object.entries(e.props)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" ")}
                </span>
                <span className="tabular ml-auto text-[10.5px] text-muted">
                  {new Date(e.at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
