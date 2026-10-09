import Link from "next/link";
import { notFound } from "next/navigation";
import { bySymbol, stocks, latestDate, yearRange, yearReturn } from "../../lib/market";
import { fmtPrice, fmtPct, fmtDelta, gainClass } from "../../lib/format";
import PriceChart from "../../components/price-chart";
import MoneyFlowPanel from "../../components/money-flow";
import FundamentalsPanel from "../../components/fundamentals";

export function generateStaticParams() {
  return stocks.map((s) => ({ symbol: s.symbol }));
}

export default function StockDetail({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const s = bySymbol[symbol];
  if (!s || !stocks.includes(s)) notFound();

  const { high, low } = yearRange(s.history);
  const ytd = yearReturn(s.history);

  const stats = [
    { label: "Price", value: `$${fmtPrice(s.price)}` },
    { label: "Day change", value: `${fmtDelta(s.change)} (${fmtPct(s.changePct)})`, tone: gainClass(s.changePct) },
    { label: "52-week high", value: `$${fmtPrice(high)}` },
    { label: "52-week low", value: `$${fmtPrice(low)}` },
    { label: "1-year return", value: fmtPct(ytd), tone: gainClass(ytd) },
    { label: "Data as of", value: latestDate },
  ];

  return (
    <div>
      <Link href="/stocks" className="text-sm font-semibold text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-800">
        ← All stocks
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-mono text-4xl font-extrabold">{s.symbol}</h1>
        <span className="text-lg text-zinc-400 light:text-zinc-600">{s.name}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="tnum text-3xl font-extrabold">${fmtPrice(s.price)}</span>
        <span className={`tnum text-base font-bold ${gainClass(s.changePct)}`}>
          {fmtDelta(s.change)} ({fmtPct(s.changePct)})
        </span>
        <span className="text-xs text-zinc-500">today</span>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-stone-900/60 p-4 light:border-zinc-200 light:bg-white sm:p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          One-year price history
        </h2>
        <div className="mt-3">
          <PriceChart history={s.history} />
        </div>
      </div>

      {s.moneyFlow && (
        <div className="mt-4">
          <MoneyFlowPanel mf={s.moneyFlow} />
        </div>
      )}

      {s.fundamentals && (
        <div className="mt-4">
          <FundamentalsPanel f={s.fundamentals} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((st) => (
          <div key={st.label} className="rounded-2xl border border-white/10 bg-stone-900/60 p-4 light:border-zinc-200 light:bg-white">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{st.label}</div>
            <div className={`tnum mt-1.5 text-lg font-extrabold ${st.tone ?? ""}`}>{st.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5 light:bg-amber-50">
        <p className="text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
          <span className="font-bold text-amber-300 light:text-amber-700">Honest note: </span>
          this chart shows what happened, not what happens next. Past performance does not
          predict future results — most professional stock pickers underperform a plain
          index fund over time. Nothing on this page is financial advice.
        </p>
      </div>
    </div>
  );
}
