"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { stocks, bySymbol } from "../lib/market";
import { fmtPct, gainClass } from "../lib/format";
import modelFile from "../../data/model_picks.json";
import {
  currentWeekKey,
  weekLabel,
  gradePicks,
  type WeekGrade,
} from "../lib/weeks";

const LS_KEY = "pg-pickem-v1";
const PICKS_PER_WEEK = 5;

type ModelFile = {
  strategy: string;
  generated: string;
  weeks: Record<string, { picks: string[]; picked_at: string }>;
};
const model = modelFile as ModelFile;

type Stored = { weeks: Record<string, string[]> };

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d.weeks === "object") return d as Stored;
    }
  } catch {
    /* fresh start */
  }
  return { weeks: {} };
}

function ScoreCell({ v, suffix = "" }: { v: number | null; suffix?: string }) {
  if (v == null) return <span className="text-zinc-600">—</span>;
  return (
    <span className={`tnum font-bold ${gainClass(v)}`}>
      {fmtPct(v)}{suffix}
    </span>
  );
}

export default function PickEm() {
  const [stored, setStored] = useState<Stored>({ weeks: {} });
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const week = currentWeekKey();

  useEffect(() => {
    const s = loadStored();
    setStored(s);
    setDraft(s.weeks[week] ?? []);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function save(next: string[]) {
    setDraft(next);
    setStored((prev) => {
      const out: Stored = { weeks: { ...prev.weeks, [week]: next } };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(out));
      } catch {
        /* storage unavailable */
      }
      return out;
    });
  }

  const addStock = (symbol: string) => {
    if (draft.includes(symbol) || draft.length >= PICKS_PER_WEEK) return;
    save([...draft, symbol]);
    setQuery("");
  };

  const removeStock = (symbol: string) => {
    save(draft.filter((s) => s !== symbol));
  };

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return stocks
      .filter(
        (s) =>
          !draft.includes(s.symbol) &&
          (s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [query, draft]);

  // ---- Past results ----
  const pastWeeks = useMemo(() => {
    return Object.keys(stored.weeks)
      .filter((k) => k !== week && (stored.weeks[k]?.length ?? 0) > 0)
      .sort()
      .reverse()
      .map((k) => ({ weekKey: k, picks: stored.weeks[k], grade: gradePicks(k, stored.weeks[k]) }));
  }, [stored, week]);

  const season = useMemo(() => {
    let total = 0;
    let graded = 0;
    let wins = 0;
    for (const p of pastWeeks) {
      if (p.grade.outperformance != null) {
        total += p.grade.outperformance;
        graded++;
        if (p.grade.outperformance > 0) wins++;
      }
    }
    return { total, graded, wins };
  }, [pastWeeks]);

  const modelWeeks = useMemo(() => {
    const keys = Object.keys(model.weeks).sort();
    const latest = keys[keys.length - 1];
    const past = keys
      .slice(0, -1)
      .reverse()
      .map((k) => ({
        weekKey: k,
        picks: model.weeks[k].picks,
        pickedAt: model.weeks[k].picked_at,
        grade: gradePicks(k, model.weeks[k].picks),
      }));
    return {
      latest,
      latestPicks: model.weeks[latest].picks,
      latestPickedAt: model.weeks[latest].picked_at,
      past,
    };
  }, []);

  const modelSeason = useMemo(() => {
    let total = 0;
    let graded = 0;
    let wins = 0;
    for (const p of modelWeeks.past) {
      if (p.grade.outperformance != null) {
        total += p.grade.outperformance;
        graded++;
        if (p.grade.outperformance > 0) wins++;
      }
    }
    return { total, graded, wins };
  }, [modelWeeks]);

  const thisGrade: WeekGrade | null =
    ready && draft.length > 0 ? gradePicks(week, draft) : null;

  return (
    <div>
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90 light:text-emerald-700">
        <span className="h-px w-8 bg-emerald-400/60 light:bg-emerald-600/70" aria-hidden="true" />
        Paper trading · no real money
      </div>
      <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
        Pick<span className="text-emerald-400 light:text-emerald-600">&rsquo;em</span>
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        Pick the {PICKS_PER_WEEK} stocks you think will gain the most each week
        (Monday–Sunday). We score your average gain against the S&P 500 for the same
        week — fake money, public scoreboard. Picks live in your browser, no account
        needed. This is a game, not investment advice.
      </p>

      {/* This week's card */}
      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
          This week{" "}
          <span className="font-sans text-sm font-medium normal-case tracking-normal text-zinc-500">
            · {weekLabel(week)}
          </span>
        </h2>
        <span className="text-sm text-zinc-400 light:text-zinc-600">
          {ready ? `${draft.length} of ${PICKS_PER_WEEK} picked` : "…"}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
        {/* Slots */}
        <div className="grid gap-2 sm:grid-cols-5">
          {Array.from({ length: PICKS_PER_WEEK }).map((_, i) => {
            const sym = draft[i];
            const inst = sym ? bySymbol[sym] : null;
            return (
              <div
                key={i}
                className={`flex min-h-[76px] flex-col justify-center rounded-xl border px-3 py-2 ${
                  sym
                    ? "border-emerald-400/50 bg-emerald-400/10"
                    : "border-dashed border-white/15 light:border-zinc-300"
                }`}
              >
                {inst ? (
                  <>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-mono text-sm font-extrabold">{inst.symbol}</span>
                      <button
                        onClick={() => removeStock(inst.symbol)}
                        aria-label={`Remove ${inst.symbol}`}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                    <span className="truncate text-xs text-zinc-500">{inst.name}</span>
                  </>
                ) : (
                  <span className="text-xs text-zinc-600 light:text-zinc-400">
                    Pick {i + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Search / add */}
        <div className="relative mt-4 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stocks to add…"
            disabled={draft.length >= PICKS_PER_WEEK}
            className="w-full rounded-xl border border-white/15 bg-stone-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none disabled:opacity-50 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-900"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-stone-900 py-1 shadow-xl light:border-zinc-200 light:bg-white">
              {suggestions.map((s) => (
                <li key={s.symbol}>
                  <button
                    onClick={() => addStock(s.symbol)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-white/5 light:hover:bg-zinc-100"
                  >
                    <span>
                      <span className="font-mono font-bold">{s.symbol}</span>
                      <span className="ml-2 text-zinc-500">{s.name}</span>
                    </span>
                    <span className={`tnum font-semibold ${gainClass(s.changePct)}`}>
                      {fmtPct(s.changePct)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Honor system — lock your picks before Monday's open. Your card is graded when
          the week closes on Friday.
        </p>
      </div>

      {/* This week grading status */}
      {ready && draft.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
          {thisGrade && thisGrade.complete ? (
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Your week</div>
                <ScoreCell v={thisGrade.userScore} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">S&P 500</div>
                <ScoreCell v={thisGrade.spx} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">You vs S&P</div>
                <ScoreCell v={thisGrade.outperformance} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 light:text-zinc-600">
              Week in progress — grading when the week closes on Friday.
            </p>
          )}
        </div>
      )}

      {/* Season scoreboard */}
      <h2 className="mt-12 font-display text-3xl font-semibold uppercase tracking-wide">
        Season scoreboard
      </h2>
      {pastWeeks.length === 0 ? (
        <p className="mt-2 max-w-2xl text-[15px] text-zinc-400 light:text-zinc-600">
          No completed weeks yet. Your graded weeks will appear here, scored against the
          S&P 500.
        </p>
      ) : (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Total vs S&P 500
              </div>
              <div className="tnum mt-2 text-3xl font-extrabold">
                <ScoreCell v={season.graded ? season.total : null} />
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                summed weekly outperformance
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Weeks beaten
              </div>
              <div className="tnum mt-2 text-3xl font-extrabold">
                {season.wins}<span className="text-zinc-500">/{season.graded}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">weeks ahead of the index</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                The honest benchmark
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
                ~90% of professional fund managers trail the S&P 500 over 15 years. If
                you're behind, you're in good company.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 light:border-zinc-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-stone-900/60 text-xs uppercase tracking-wider text-zinc-500 light:border-zinc-200 light:bg-zinc-100">
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Your picks</th>
                  <th className="px-4 py-3 text-right">You</th>
                  <th className="px-4 py-3 text-right">S&P 500</th>
                  <th className="px-4 py-3 text-right">You vs S&P</th>
                </tr>
              </thead>
              <tbody>
                {pastWeeks.map((p) => (
                  <tr key={p.weekKey} className="border-b border-white/5 last:border-0 light:border-zinc-100">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      {weekLabel(p.weekKey)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{p.picks.join(", ")}</span>
                    </td>
                    <td className="px-4 py-3 text-right"><ScoreCell v={p.grade.userScore} /></td>
                    <td className="px-4 py-3 text-right"><ScoreCell v={p.grade.spx} /></td>
                    <td className="px-4 py-3 text-right"><ScoreCell v={p.grade.outperformance} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mockfolio Model */}
      <div className="mt-16 border-t border-white/10 pt-10 light:border-zinc-200">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/90 light:text-emerald-700">
          <span className="h-px w-8 bg-emerald-400/60 light:bg-emerald-600/70" aria-hidden="true" />
          House model · mechanical rule
        </div>
        <h2 className="mt-3 font-display text-3xl font-semibold uppercase tracking-wide">
          Mockfolio <span className="text-emerald-400 light:text-emerald-600">Model</span>
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
          The house model plays by your rules: 5 stocks picked at the previous
          Friday&rsquo;s close — the 5 with the best trailing 20-trading-day
          returns — held one week and graded against the S&P 500. No human
          override, no lookahead. Backtested over 44 weeks it beat the index 41%
          of the time: no edge demonstrated. It&rsquo;s here to prove the
          site&rsquo;s point, not to give advice.
        </p>

        <h3 className="mt-8 font-display text-2xl font-semibold uppercase tracking-wide">
          This week&rsquo;s model picks{" "}
          <span className="font-sans text-sm font-medium normal-case tracking-normal text-zinc-500">
            · {weekLabel(modelWeeks.latest)}
          </span>
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Picked at Friday&rsquo;s close ({modelWeeks.latestPickedAt}). Locked —
          the model doesn&rsquo;t get to change its mind.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {modelWeeks.latestPicks.map((sym) => {
            const inst = bySymbol[sym];
            return (
              <div
                key={sym}
                className="flex min-h-[76px] flex-col justify-center rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-3 py-2"
              >
                <span className="font-mono text-sm font-extrabold">{sym}</span>
                <span className="truncate text-xs text-zinc-500">
                  {inst ? inst.name : ""}
                </span>
              </div>
            );
          })}
        </div>

        <h3 className="mt-12 font-display text-2xl font-semibold uppercase tracking-wide">
          Model track record
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Total vs S&P 500
            </div>
            <div className="tnum mt-2 text-3xl font-extrabold">
              <ScoreCell v={modelSeason.graded ? modelSeason.total : null} />
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              summed weekly outperformance
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Weeks beaten
            </div>
            <div className="tnum mt-2 text-3xl font-extrabold">
              {modelSeason.wins}
              <span className="text-zinc-500">/{modelSeason.graded}</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">weeks ahead of the index</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              The rule, in full
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
              Rank the 30 stocks by 20-day return at Friday&rsquo;s close, buy
              the top 5, hold a week. Every pick timestamped, every week graded —
              wins and losses.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 light:border-zinc-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-stone-900/60 text-xs uppercase tracking-wider text-zinc-500 light:border-zinc-200 light:bg-zinc-100">
                <th className="px-4 py-3">Week</th>
                <th className="px-4 py-3">Model picks</th>
                <th className="px-4 py-3 text-right">Model</th>
                <th className="px-4 py-3 text-right">S&P 500</th>
                <th className="px-4 py-3 text-right">Model vs S&P</th>
              </tr>
            </thead>
            <tbody>
              {modelWeeks.past.map((p) => (
                <tr key={p.weekKey} className="border-b border-white/5 last:border-0 light:border-zinc-100">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    {weekLabel(p.weekKey)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">{p.picks.join(", ")}</span>
                  </td>
                  <td className="px-4 py-3 text-right"><ScoreCell v={p.grade.userScore} /></td>
                  <td className="px-4 py-3 text-right"><ScoreCell v={p.grade.spx} /></td>
                  <td className="px-4 py-3 text-right"><ScoreCell v={p.grade.outperformance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Scores use Friday-to-Friday closing prices. Read the{" "}
        <Link href="/disclaimer" className="font-semibold text-emerald-400 hover:text-emerald-300 light:text-emerald-700">
          disclaimer
        </Link>{" "}
        before taking any of this seriously.
      </p>
    </div>
  );
}
