"use client";

import { useEffect, useState } from "react";
import type { Quote } from "../api/quotes/route";

export type LiveStatus = "live" | "closed" | "loading";

/** True during US market hours (Mon–Fri 6:30am–1:00pm PT). */
function marketOpenPT(now = new Date()): boolean {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const day = parts.weekday;
  if (day === "Sat" || day === "Sun") return false;
  const mins = Number(parts.hour) * 60 + Number(parts.minute);
  return mins >= 6 * 60 + 30 && mins < 13 * 60;
}

/**
 * Polls /api/quotes every 60s while the market is open.
 * Falls back to the daily snapshot (status "closed") on any failure.
 */
export function useLiveQuotes() {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [status, setStatus] = useState<LiveStatus>("loading");

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let alive = true;

    async function poll() {
      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok) throw new Error("quote api failed");
        const data = await res.json();
        if (!alive) return;
        const qs: Record<string, Quote> = data.quotes ?? {};
        setQuotes(qs);
        const times = Object.values(qs)
          .map((q) => q.marketTime)
          .filter(Boolean);
        const newest = times.length ? Math.max(...times) * 1000 : 0;
        const fresh = Date.now() - newest < 30 * 60 * 1000;
        setStatus(marketOpenPT() && fresh ? "live" : "closed");
      } catch {
        if (alive) setStatus("closed");
      }
    }

    poll();
    // Always run the scheduler: a tab loaded before the open must start
    // polling at 6:30am without a reload, and the badge must flip back
    // to "closed" after 1pm.
    timer = setInterval(() => {
      if (!marketOpenPT()) {
        setStatus((s) => (s === "live" ? "closed" : s));
        return;
      }
      poll();
    }, 60_000);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return { quotes, status };
}

export function LiveBadge({ status }: { status: LiveStatus }) {
  if (status === "loading") return null;
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 light:text-emerald-700">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live · ~15 min delayed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-500 light:border-zinc-300 light:text-zinc-500">
      Market closed · daily snapshot
    </span>
  );
}
