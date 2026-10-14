import Link from "next/link";
import { indices, stocks, latestDate } from "./lib/market";
import MarketSections from "./components/market-sections";
import wildDayFile from "../data/wild_day.json";

type WildDayPrediction = {
  for_date: string;
  prob: number;
  expected_abs_pct: number;
  label: string;
};
const wildPrediction = (
  wildDayFile as unknown as { prediction: WildDayPrediction | null }
).prediction;

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function Home() {

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

      <MarketSections indices={indices} stocks={stocks} latestDate={latestDate} />

      {/* Wild Day card */}
      {wildPrediction && (
        <div className="mt-10 rounded-2xl border border-white/10 p-6 light:border-zinc-200 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90 light:text-emerald-700">
                The volatility model · Tomorrow, {prettyDate(wildPrediction.for_date)}
              </div>
              <div className="mt-3 flex items-end gap-4">
                <span className="font-display text-6xl font-semibold leading-none">
                  {(wildPrediction.prob * 100).toFixed(1)}%
                </span>
                <span className="pb-1 text-sm text-zinc-400 light:text-zinc-600">
                  chance of a <strong>wild day</strong> — SPY moves 1% or more,
                  either direction. {wildPrediction.label}; expected move about
                  ±{wildPrediction.expected_abs_pct.toFixed(2)}%.
                </span>
              </div>
              <p className="mt-3 max-w-xl text-sm text-zinc-500">
                Direction is unpredictable — we tested it. How much the market
                moves is a pattern. This probability is published every evening
                and graded in public the next day.
              </p>
              {wildPrediction.for_date === "2026-10-14" && (
                <p className="mt-3 max-w-xl text-sm text-amber-300/90 light:text-amber-700">
                  Heads up: tomorrow is a CPI release day (report lands 8:30
                  AM ET). Scheduled economic-report days aren&apos;t a model
                  input yet — only Fed announcement days are flagged.
                </p>
              )}
            </div>
            <Link
              href="/wild-day"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-white/30 hover:text-white light:border-zinc-300 light:text-zinc-800 light:hover:border-zinc-500"
            >
              See the record
            </Link>
          </div>
        </div>
      )}

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
