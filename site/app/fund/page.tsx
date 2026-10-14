import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Paper Fund — Mockfolio's paper hedge fund, run by a written charter",
  description:
    "A paper-only hedge fund with mechanical sleeves, frozen rules, public grading against the S&P 500, and kill criteria written down in advance. No real money, no advice.",
};

const sleeves = [
  {
    name: "Momentum",
    status: "Live",
    statusClass:
      "border-emerald-400/30 text-emerald-300 light:border-emerald-300 light:text-emerald-700",
    rule: "Each week, hold the 5 stocks with the strongest trailing 20-trading-day returns, equal weight, rebalanced weekly. Mechanical: no human override, no lookahead.",
    record:
      "Picks and grades are public on the Pick'em page, Friday close to Friday close against the S&P 500. The graded history is reconstructed back to November 2025 from historical prices; picks published in advance began in October 2026.",
    gate: "The rule is frozen. A 2026 sweep tested 14 variants (lookbacks, volatility adjustments, holding periods, concentration) and none beat it beyond noise — so it stays as is until a pre-registered test says otherwise.",
    href: "/pick-em",
    linkLabel: "See the momentum record",
  },
  {
    name: "News Blend",
    status: "Shadow",
    statusClass:
      "border-sky-400/30 text-sky-300 light:border-sky-300 light:text-sky-700",
    rule: "Momentum ranks blended with FinBERT news-sentiment ranks over the prior week's coverage, top 5, equal weight. Spec frozen October 9, 2026.",
    record:
      "Paper-traded out-of-sample since October 12, 2026, graded weekly against the S&P 500. Its picks are not published as fund positions while it is in shadow; the tally (weeks graded, mean excess return, hit rate) will be published at its review gate, win or lose.",
    gate: "Go / no-go review at 25 graded weeks (around April 2027): adopt it as a live sleeve, keep it in shadow, or drop it — decided on the tally, in the open.",
    href: null,
    linkLabel: null,
  },
  {
    name: "Wild Day",
    status: "Probationary overlay",
    statusClass:
      "border-amber-400/30 text-amber-300 light:border-amber-300 light:text-amber-700",
    rule: "A nightly probability that tomorrow SPY moves 1% or more in either direction. It forecasts movement size, never direction.",
    record:
      "Every call is published the evening before and graded in public the next day on the Wild Day page, next to the simple baselines it has to beat.",
    gate: "An expectations overlay only. It cannot size, veto, or otherwise touch a position until it has 100 live grades and a separate pre-registered test — approved in advance — says it should.",
    href: "/wild-day",
    linkLabel: "See the Wild Day record",
  },
];

const houseRules = [
  "Paper money only. Performance is reported as return versus the S&P 500, never as dollars, and nothing here is investment advice.",
  "Rules are frozen between quarterly reviews. No mid-quarter tweaks, no quiet edits, no exceptions for a bad week.",
  "Any rule change requires a pre-registered walk-forward test against bars written down before the test runs — plus the fund owner's explicit approval.",
  "Null results get published too. A sleeve that fails its test is reported as a failure, not buried.",
  "Long-only, no leverage, no options, no shorting. If a strategy needs those to work, it doesn't belong in this fund.",
  "If a data pipeline breaks, the sleeve pauses and the pause is disclosed. Gaps are logged honestly, never backfilled after the fact.",
];

const killCriteria = [
  "A trading sleeve is retired at a quarterly review if it trails the S&P 500 by more than 10 percentage points cumulatively since inception (or adoption) and no pre-registered fix has passed its adoption bars.",
  "The Wild Day overlay is retired if, at 100 live grades, its Brier score is worse than the simple persistence baseline it is supposed to beat.",
  "The News Blend sleeve is decided at its 25-week gate on its published tally: adopt, keep shadowing, or drop.",
  "Retirements are announced on this page with the final record attached. The record stays up; only the trading stops.",
];

export default function FundPage() {
  return (
    <div>
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90 light:text-emerald-700">
        <span className="h-px w-8 bg-emerald-400/60 light:bg-emerald-600/70" aria-hidden="true" />
        Mockfolio · The Paper Fund
      </div>
      <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
        A hedge fund with <span className="text-emerald-400 light:text-emerald-600">no money</span> in it
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        The Paper Fund is an experiment in discipline: a small portfolio of
        mechanical strategies ("sleeves"), each run by rules written down in
        advance, each graded in public against the S&P 500. It is managed by
        Snoopy, an AI, under this charter. The fund's owner approves every
        rule change. There is no real money involved, no account to open, and
        nothing here is a recommendation to buy or sell anything — the point
        is the scoreboard, and whether rules plus honesty beat vibes.
      </p>

      <div className="mt-6 max-w-3xl rounded-2xl border border-white/10 p-6 light:border-zinc-200 sm:p-8">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          The mandate
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
          Beat the S&P 500 over rolling quarters using only mechanical,
          pre-registered rules — or publish the evidence that we didn't.
          Every pick is posted before it can be graded. Every grade stays
          public, including the embarrassing ones. The fund's edge, if it has
          one, is supposed to come from process: frozen rules, honest
          baselines, and kill criteria decided before anyone knows the
          results.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 light:border-zinc-300 light:text-zinc-700">
            Benchmark: S&P 500
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 light:border-zinc-300 light:text-zinc-700">
            Charter adopted: October 13, 2026
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 light:border-zinc-300 light:text-zinc-700">
            Fund inception: October 14, 2026
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 light:border-zinc-300 light:text-zinc-700">
            Reviews: quarterly
          </span>
        </div>
      </div>

      <h2 className="mt-12 font-display text-3xl font-semibold uppercase tracking-wide">
        The sleeves
      </h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {sleeves.map((s) => (
          <div
            key={s.name}
            className="flex flex-col rounded-2xl border border-white/10 p-6 light:border-zinc-200"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-semibold uppercase tracking-wide">
                {s.name}
              </h3>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${s.statusClass}`}
              >
                {s.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
              {s.rule}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
              {s.record}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              {s.gate}
            </p>
            {s.href && (
              <Link
                href={s.href}
                className="mt-4 inline-block text-sm font-bold text-emerald-400 transition hover:text-emerald-300 light:text-emerald-700 light:hover:text-emerald-600"
              >
                {s.linkLabel} →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold uppercase tracking-wide">
            House rules
          </h2>
          <ul className="mt-4 space-y-3">
            {houseRules.map((r) => (
              <li
                key={r}
                className="max-w-xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600"
              >
                <span className="mr-2 text-emerald-400 light:text-emerald-600">▸</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold uppercase tracking-wide">
            Kill criteria
          </h2>
          <ul className="mt-4 space-y-3">
            {killCriteria.map((r) => (
              <li
                key={r}
                className="max-w-xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600"
              >
                <span className="mr-2 text-amber-400 light:text-amber-600">▸</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-12 max-w-3xl rounded-2xl border border-white/10 p-6 light:border-zinc-200">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          Governance
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
          Manager: Snoopy (an AI) — runs the pipelines, publishes the picks,
          grades the records, and writes the quarterly report cards.
          Owner: Bryant — approves every rule change, adoption, and
          retirement before it happens. Sleeve records that predate this
          charter stay on their own pages, labeled as what they are; fund
          accounting under the charter starts at inception, October 14, 2026.
          First quarterly report card: January 14, 2027 — keep, kill, or
          change, with the numbers attached.
        </p>
      </div>
    </div>
  );
}
