import type { Metadata } from "next";
import wildDayFile from "../../data/wild_day.json";

export const metadata: Metadata = {
  title: "Wild Day — tomorrow's market volatility, predicted and graded",
  description:
    "Every evening, a model publishes the probability that tomorrow is a wild day for the S&P 500 (a move of 1% or more, either direction). Graded in public the next day.",
};

type Prediction = {
  issued_after: string;
  for_date: string;
  prob: number;
  expected_abs_pct: number;
  label: string;
  baselines: { persistence: number; vix: number; climatology: number };
};

type HistoryEntry = {
  date: string;
  predicted_for: string;
  prob: number;
  persist: number;
  vix: number;
  clim: number;
  expected_abs_pct: number;
  abs_ret_pct: number;
  wild: boolean;
};

type WildDayFile = {
  generated: string;
  data_asof: string;
  vix_asof: string | null;
  prediction: Prediction | null;
  history: HistoryEntry[];
  live_stats: {
    n: number;
    wild_days: number;
    brier_model?: number;
    brier_persistence?: number;
    brier_vix?: number;
    brier_climatology?: number;
    skill_vs_persistence?: number;
  };
  backtest: {
    window: string;
    n: number;
    wild_rate: number;
    brier_model: number;
    brier_climatology: number;
    brier_persistence: number;
    brier_vix: number;
    skill_vs_climatology: number;
    skill_vs_persistence: number;
    skill_vs_vix: number;
    calibration_slope: number;
    years_positive: string;
    auc_model: number;
  };
  model_info: { fit_month: string; fit_through: string; train_rows: number };
};

const wd = wildDayFile as unknown as WildDayFile;
const bt = wd.backtest;

function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function skill(x: number): string {
  return `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
}

export default function WildDayPage() {
  const p = wd.prediction;
  const history = [...wd.history].reverse();
  const stats = wd.live_stats;

  return (
    <div>
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90 light:text-emerald-700">
        <span className="h-px w-8 bg-emerald-400/60 light:bg-emerald-600/70" aria-hidden="true" />
        Mockfolio · The volatility model
      </div>
      <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
        Wild day, <span className="text-emerald-400 light:text-emerald-600">or quiet?</span>
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        Nobody can predict which way the market moves — we tested that, and the
        predictions were noise. But <em>how much</em> it moves follows a real
        pattern: volatility clusters. Calm follows calm, storms follow storms.
        So every evening this model publishes one number — the probability that
        tomorrow the S&P 500 (via SPY) moves <strong>1% or more in either
        direction</strong> — and every morning it grades itself in public.
      </p>

      <div className="mt-6 max-w-3xl rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5 light:bg-amber-50">
        <p className="text-[15px] leading-relaxed text-zinc-300 light:text-zinc-700">
          <strong>Read this first:</strong> this is a probability about the{" "}
          <em>size</em> of tomorrow&apos;s move — never its direction, and never
          trading advice. It is an experiment with a public record, wins and
          losses included. What it is useful for is expectations: is tomorrow
          likely to be a day when headlines move markets, or a day when
          nothing much happens?
        </p>
      </div>

      {/* Tomorrow's prediction */}
      {p ? (
        <div className="mt-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-6 light:bg-emerald-50 sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90 light:text-emerald-700">
            Tomorrow · {prettyDate(p.for_date)}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="font-display text-6xl font-semibold leading-none">
                {pct(p.prob)}
              </div>
              <div className="mt-2 text-sm text-zinc-400 light:text-zinc-600">
                chance of a wild day (SPY moves ≥ 1%)
              </div>
            </div>
            <div>
              <div className="font-display text-3xl font-semibold leading-none">
                {p.label}
              </div>
              <div className="mt-2 text-sm text-zinc-400 light:text-zinc-600">
                expected move: about ±{p.expected_abs_pct.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 light:border-zinc-300 light:text-zinc-700">
              Simple persistence rule: {pct(p.baselines.persistence)}
            </span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 light:border-zinc-300 light:text-zinc-700">
              VIX-implied: {pct(p.baselines.vix)}
            </span>
            <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 light:border-zinc-300 light:text-zinc-700">
              Long-run rate: {pct(p.baselines.climatology)}
            </span>
          </div>
          <p className="mt-4 text-xs text-zinc-500 light:text-zinc-500">
            Published after the {prettyDate(p.issued_after)} close, from data
            available at that close. Model last refit {wd.model_info.fit_month}{" "}
            on {wd.model_info.train_rows.toLocaleString()} training days
            (expanding window from 2010, refit monthly).
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/10 p-6 light:border-zinc-200">
          <p className="text-[15px] text-zinc-400 light:text-zinc-600">
            The next prediction posts after today&apos;s close.
          </p>
        </div>
      )}

      {/* Live record */}
      <h2 className="mt-12 font-display text-3xl font-semibold uppercase tracking-wide">
        The live record
      </h2>
      {stats.n === 0 ? (
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
          The live record starts with tomorrow&apos;s grade — nothing is
          backfilled or cherry-picked. Judge the model on the backtest below
          until roughly 100 live days have accumulated; early live numbers
          will be noisy, and we&apos;ll say so every time we cite them.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Days graded", value: String(stats.n) },
              { label: "Wild days", value: String(stats.wild_days) },
              {
                label: "Live Brier (model)",
                value: stats.brier_model !== undefined ? stats.brier_model.toFixed(3) : "—",
              },
              {
                label: "Skill vs persistence",
                value:
                  stats.skill_vs_persistence !== undefined
                    ? skill(stats.skill_vs_persistence)
                    : "—",
              },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-2xl border border-white/10 p-4 light:border-zinc-200"
              >
                <div className="font-display text-2xl font-semibold">{t.value}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  {t.label}
                </div>
              </div>
            ))}
          </div>
          {stats.n < 100 && (
            <p className="mt-3 text-sm text-zinc-500">
              Probationary period: fewer than 100 graded days — treat live
              scores as preliminary.
            </p>
          )}
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 light:border-zinc-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-zinc-500 light:border-zinc-200">
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Persistence</th>
                  <th className="px-4 py-3">VIX</th>
                  <th className="px-4 py-3">Actual move</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 60).map((h) => (
                  <tr
                    key={h.date}
                    className="border-b border-white/5 last:border-0 light:border-zinc-100"
                  >
                    <td className="px-4 py-2.5">{prettyDate(h.date)}</td>
                    <td className="px-4 py-2.5 font-semibold">{pct(h.prob)}</td>
                    <td className="px-4 py-2.5 text-zinc-400 light:text-zinc-600">
                      {pct(h.persist)}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 light:text-zinc-600">
                      {pct(h.vix)}
                    </td>
                    <td className="px-4 py-2.5">±{h.abs_ret_pct.toFixed(2)}%</td>
                    <td className="px-4 py-2.5">
                      {h.wild ? (
                        <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-bold uppercase text-red-400 light:bg-red-600/15 light:text-red-600">
                          Wild
                        </span>
                      ) : (
                        <span className="rounded bg-zinc-500/15 px-2 py-0.5 text-xs font-bold uppercase text-zinc-400 light:bg-zinc-500/15 light:text-zinc-600">
                          Quiet
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Backtest */}
      <h2 className="mt-12 font-display text-3xl font-semibold uppercase tracking-wide">
        The backtest <span className="text-zinc-500">(2016–2026)</span>
      </h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        Before this model was allowed to publish anything, it was tested the
        way every model here is tested: pre-registered rules, walk-forward —
        every prediction made only from data available at the time, refit
        monthly, across {bt.n.toLocaleString()} trading days including the
        2020 crash and the 2022 bear market. Wild days were{" "}
        {pct(bt.wild_rate)} of all days. Scores are Brier scores (lower is
        better); skill is the improvement over each baseline.
      </p>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 light:border-zinc-200">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-zinc-500 light:border-zinc-200">
              <th className="px-4 py-3">Predictor</th>
              <th className="px-4 py-3">Brier score</th>
              <th className="px-4 py-3">Model&apos;s skill vs it</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "This model", brier: bt.brier_model, s: null as number | null },
              { name: "Naive persistence (last 20 days' volatility)", brier: bt.brier_persistence, s: bt.skill_vs_persistence },
              { name: "VIX-implied (the options market's forecast)", brier: bt.brier_vix, s: bt.skill_vs_vix },
              { name: "Climatology (the long-run average rate)", brier: bt.brier_climatology, s: bt.skill_vs_climatology },
            ].map((r) => (
              <tr
                key={r.name}
                className="border-b border-white/5 last:border-0 light:border-zinc-100"
              >
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5">{r.brier.toFixed(3)}</td>
                <td className="px-4 py-2.5">{r.s === null ? "—" : skill(r.s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        The model beat the persistence rule — the hard baseline, since it
        already captures most of the clustering pattern — in{" "}
        <strong>{bt.years_positive} test years</strong>. Its calibration
        slope was {bt.calibration_slope.toFixed(2)} (1.00 is perfect): when
        it said 30%, wild days happened about 30% of the time. That is the
        whole claim — a modest, honest edge in calibration and accuracy,
        not a crystal ball.
      </p>

      {/* Methodology */}
      <h2 className="mt-12 font-display text-3xl font-semibold uppercase tracking-wide">
        How it works
      </h2>
      <div className="mt-3 max-w-2xl space-y-4 text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        <p>
          A logistic regression — deliberately simple, no black box — reads
          tonight&apos;s market and estimates tomorrow&apos;s wild-day
          probability. Its inputs: realized volatility over the last 5, 20,
          and 60 days; an exponentially-weighted volatility estimate;
          yesterday&apos;s move and the biggest move of the last week; the
          VIX level and the gap between the VIX and the 3-month implied
          volatility; the day of the week; and whether tomorrow is a
          scheduled Federal Reserve announcement day. Nothing else. No
          headlines, no sentiment, no price direction.
        </p>
        <p>
          Data is free and public: SPY prices from Yahoo Finance, the VIX
          and 3-month implied volatility from the CBOE (the exchange that
          publishes them; cross-checked against the Fed&apos;s FRED
          database), and the FOMC calendar from the Federal Reserve. The model refits on the
          first run of each month using every day back to 2010.
        </p>
        <p>
          Known limitations, stated plainly: only scheduled Fed days are
          flagged — an unscheduled emergency announcement can&apos;t be
          known in advance, and CPI/jobs-report days are not yet flagged
          (their historical calendars couldn&apos;t be sourced reliably).
          The model is also, by design, reactive: it can only say
          "conditions like these have usually meant a wild day," never why
          tomorrow specifically would be one.
        </p>
        <p>
          The study behind this page — the pre-registered test design and
          the full results, including every place the model is weak — is
          kept with the project and summarized in the backtest section
          above. If the live record degrades, this page will say so; that
          is the deal with everything on this site.
        </p>
      </div>
    </div>
  );
}
