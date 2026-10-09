"use client";

import Link from "next/link";
import { fmtPrice, fmtPct, fmtDelta, gainClass } from "../lib/format";
import type { Instrument } from "../lib/market";
import Sparkline from "./sparkline";
import { useLiveQuotes, LiveBadge, type LiveStatus } from "./live-quotes";
import type { Quote } from "../api/quotes/route";

function withLive(inst: Instrument, quotes: Record<string, Quote>): Instrument {
  const q = quotes[inst.symbol];
  if (!q) return inst;
  return { ...inst, price: q.price, change: q.change, changePct: q.changePct };
}

function IndexCard({ inst }: { inst: Instrument }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {inst.name}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="tnum text-3xl font-extrabold">{fmtPrice(inst.price)}</div>
          <div className={`tnum mt-1 text-sm font-semibold ${gainClass(inst.changePct)}`}>
            {fmtDelta(inst.change)} ({fmtPct(inst.changePct)})
          </div>
        </div>
        <Sparkline history={inst.history} width={140} height={44} />
      </div>
    </div>
  );
}

function Movers({
  title,
  items,
  gainers,
}: {
  title: string;
  items: Instrument[];
  gainers: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 light:text-zinc-600">
        {title}
      </h3>
      <ul className="mt-3 divide-y divide-white/5 light:divide-zinc-100">
        {items.map((s) => (
          <li key={s.symbol}>
            <Link
              href={`/stocks/${s.symbol}`}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="font-mono text-sm font-bold">{s.symbol}</div>
                <div className="truncate text-xs text-zinc-500">{s.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <Sparkline history={s.history} width={84} height={28} positive={gainers} />
                <div className={`tnum w-20 text-right text-sm font-bold ${gainClass(s.changePct)}`}>
                  {fmtPct(s.changePct)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MarketSections({
  indices,
  stocks,
  latestDate,
}: {
  indices: Instrument[];
  stocks: Instrument[];
  latestDate: string;
}) {
  const { quotes, status } = useLiveQuotes();
  const live = (inst: Instrument) => withLive(inst, quotes);
  const liveIndices = indices.map(live);
  const liveStocks = stocks.map(live);
  const gainers = [...liveStocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const losers = [...liveStocks].sort((a, b) => a.changePct - b.changePct).slice(0, 5);

  return (
    <div>
      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Market indices
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <LiveBadge status={status as LiveStatus} />
          <span className="text-xs text-zinc-500">Data as of {latestDate}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {liveIndices.map((idx) => (
          <IndexCard key={idx.symbol} inst={idx} />
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl font-semibold uppercase tracking-wide">
        Biggest movers today
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        From the 30-stock pick&apos;em universe. One day&apos;s move says nothing about tomorrow.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Movers title="Top gainers" items={gainers} gainers />
        <Movers title="Top losers" items={losers} gainers={false} />
      </div>
    </div>
  );
}
