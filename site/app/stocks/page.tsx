"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { stocks, latestDate } from "../lib/market";
import { fmtPrice, fmtPct, gainClass } from "../lib/format";
import { useLiveQuotes, LiveBadge } from "../components/live-quotes";
import Sparkline from "../components/sparkline";
import { cmfLabel, cmfBadgeCls } from "../components/money-flow";

type SortKey = "symbol" | "name" | "price" | "changePct" | "cmf";
type SortDir = "asc" | "desc";

export default function StocksPage() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("changePct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { quotes, status } = useLiveQuotes();

  const rows = useMemo(() => {
    const listed = stocks.map((s) => {
      const lq = quotes[s.symbol];
      const base = lq ? { ...s, price: lq.price, changePct: lq.changePct } : s;
      return { ...base, cmf: s.moneyFlow?.cmf20 ?? null };
    });
    const q = query.trim().toLowerCase();
    const filtered = q
      ? listed.filter(
          (s) =>
            s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
        )
      : [...listed];
    return filtered.sort((a, b) => {
      if (sortKey === "cmf") {
        // nulls always last, in either direction
        if (a.cmf == null && b.cmf == null) return 0;
        if (a.cmf == null) return 1;
        if (b.cmf == null) return -1;
        const d = a.cmf - b.cmf;
        return sortDir === "asc" ? d : -d;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [query, sortKey, sortDir, quotes]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "symbol" ? "asc" : "desc");
    }
  }

  const th = (label: string, key: SortKey, align = "text-left") => (
    <th className={`px-4 py-3 ${align}`}>
      <button
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider hover:text-zinc-200 light:hover:text-zinc-900"
      >
        {label}
        {sortKey === key && (
          <span className="text-emerald-400 light:text-emerald-600">
            {sortDir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
    </th>
  );

  return (
    <div>
      <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
        Stock <span className="text-emerald-400 light:text-emerald-600">universe</span>
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        30 liquid large-caps across sectors — the same universe the pick'em game draws
        from. Data as of {latestDate}. Listing a stock here is not a recommendation.
      </p>
      <div className="mt-3">
        <LiveBadge status={status} />
      </div>

      <div className="mt-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol or company…"
          className="w-full max-w-md rounded-xl border border-white/15 bg-stone-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none light:border-zinc-300 light:bg-white light:text-zinc-900"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 light:border-zinc-200">
        <table className="w-full min-w-[800px] text-left text-sm">
          <caption className="px-1 pb-2 text-left text-xs text-zinc-500 light:text-zinc-500">
            Money flow = Chaikin Money Flow over 20 trading days: whether buying
            or selling pressure dominated. Descriptive only — not a prediction.
          </caption>
          <thead>
            <tr className="border-b border-white/10 bg-stone-900/60 text-xs text-zinc-500 light:border-zinc-200 light:bg-zinc-100">
              {th("Symbol", "symbol")}
              {th("Company", "name")}
              {th("Price", "price", "text-right")}
              {th("Day change", "changePct", "text-right")}
              {th("Money flow", "cmf", "text-right")}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                1y trend
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.symbol}
                className="border-b border-white/5 last:border-0 transition hover:bg-white/[0.03] light:border-zinc-100 light:hover:bg-zinc-50"
              >
                <td className="px-4 py-3">
                  <Link href={`/stocks/${s.symbol}`} className="font-mono font-bold text-emerald-400 hover:text-emerald-300 light:text-emerald-700">
                    {s.symbol}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/stocks/${s.symbol}`} className="hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="tnum px-4 py-3 text-right font-semibold">${fmtPrice(s.price)}</td>
                <td className={`tnum px-4 py-3 text-right font-bold ${gainClass(s.changePct)}`}>
                  {fmtPct(s.changePct)}
                </td>
                <td className="px-4 py-3 text-right">
                  {s.cmf != null ? (
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${cmfBadgeCls(s.cmf)}`}
                      title={`Chaikin Money Flow (20d): ${cmfLabel(s.cmf)}`}
                    >
                      {cmfLabel(s.cmf)}
                      <span className="tnum font-semibold opacity-80">
                        {(s.cmf >= 0 ? "+" : "") + s.cmf.toFixed(2)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Sparkline history={s.history} width={110} height={32} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500">No stocks match “{query}”.</p>
      )}
    </div>
  );
}
