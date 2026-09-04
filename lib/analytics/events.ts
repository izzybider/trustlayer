"use client";

/**
 * Product analytics.
 *
 * Events are defined as a closed union so the instrumentation is reviewable in
 * one place. Every event is written to an in-app buffer (visible in the demo's
 * event stream) and, if a PostHog key is configured, posted to PostHog's capture
 * endpoint. With no key the app behaves identically minus the network call.
 */

import type { AnalyticsEvent } from "./types";

export type { AnalyticsEvent };

export type LoggedEvent = {
  id: string;
  name: AnalyticsEvent;
  at: string;
  props: Record<string, string | number | boolean | null>;
};

const BUFFER_LIMIT = 60;
let buffer: LoggedEvent[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

let distinctId: string | null = null;
function getDistinctId(): string {
  if (distinctId) return distinctId;
  if (typeof window === "undefined") return "server";
  const stored = window.localStorage.getItem("trustlayer_distinct_id");
  distinctId = stored ?? `anon_${Math.random().toString(36).slice(2, 10)}`;
  try {
    window.localStorage.setItem("trustlayer_distinct_id", distinctId);
  } catch {
    /* storage unavailable; the id stays in memory for this page view */
  }
  return distinctId;
}

function sendToPostHog(event: LoggedEvent) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || typeof window === "undefined") return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  void fetch(`${host}/i/v0/e/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      api_key: key,
      event: event.name,
      distinct_id: getDistinctId(),
      properties: { ...event.props, $lib: "trustlayer-demo" },
      timestamp: event.at,
    }),
  }).catch(() => {
    /* analytics must never break the product */
  });
}

export function track(
  name: AnalyticsEvent,
  props: Record<string, string | number | boolean | null> = {},
) {
  const event: LoggedEvent = {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    at: new Date().toISOString(),
    props,
  };
  buffer = [event, ...buffer].slice(0, BUFFER_LIMIT);
  notify();
  sendToPostHog(event);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEvents() {
  return buffer;
}

export function posthogConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

export { EVENT_CATALOG } from "./catalog";
