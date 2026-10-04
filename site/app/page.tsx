import Link from "next/link";
import { indices, stocks, latestDate } from "./lib/market";
import { fmtPrice, fmtPct, fmtDelta, gainClass } from "./lib/format";
import Sparkline from "./components/sparkline";

function IndexCard({ symbol }: { symbol: string }) {
  const idx = indices.find((i) => i.symbol === symbol)!;
  return (
    <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {idx.name}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="tnum text-3xl font-extrabold">{fmtPrice(idx.price)}</div>
          <div className={`tnum mt-1 text-sm font-semibold ${gainClass(idx.changePct)}`}>
            {fmtDelta(idx.change)} ({fmtPct(idx.changePct)})
          </div>
        </div>
        <Sparkline history={idx.history} width={140} height={44} />
      </div>
    </div>
  );
}

function Movers({ title, items, gainers }: { title: string; items: typeof stocks; gainers: boolean }) {
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

export default function Home() {
  const gainers = [...stocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const losers = [...stocks].sort((a, b) => a.changePct - b.changePct).slice(0, 5);

  return (
    <div>
      {/* Hero */}
      <div className="pt-6">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90 light:text-emerald-700">
          <span className="h-px w-8 bg-emerald-400/60 light:bg-emerald-600/70" aria-hidden="true" />
          A personal project · paper trading only
        </div>
        <h1 className="mt-3 max-w-2xl font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
          Track the <span className="text-emerald-400 light:text-emerald-600">market</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
          Track the market. Paper-trade against your friends. No real money, no advice,
          just the scoreboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/pick-em"
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-stone-950 transition hover:bg-emerald-400"
          >
            Play this week's pick'em
          </Link>
          <Link
            href="/stocks"
            className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-white/30 hover:text-white light:border-zinc-300 light:text-zinc-800 light:hover:border-zinc-500"
          >
            Browse stocks
          </Link>
        </div>
      </div>

      {/* Indices */}
      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Market indices
        </h2>
        <span className="text-xs text-zinc-500">Data as of {latestDate}</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <IndexCard symbol="^GSPC" />
        <IndexCard symbol="^IXIC" />
        <IndexCard symbol="^DJI" />
      </div>

      {/* Movers */}
      <h2 className="mt-10 font-display text-2xl font-semibold uppercase tracking-wide">
        Biggest movers today
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        From the 30-stock pick'em universe. One day's move says nothing about tomorrow.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Movers title="Top gainers" items={gainers} gainers />
        <Movers title="Top losers" items={losers} gainers={false} />
      </div>

      {/* Pick'em CTA */}
      <div className="mt-10 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-6 light:bg-emerald-50 sm:p-8">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Think you can beat the market?
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
          Pick 5 stocks each week. We score your picks against the S&P 500 — with fake
          money, on a public scoreboard. Prove it, or learn why it's hard.
        </p>
        <Link
          href="/pick-em"
          className="mt-4 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-stone-950 transition hover:bg-emerald-400"
        >
          Make your picks
        </Link>
      </div>
    </div>
  );
}
