import type { MoneyFlow } from "../lib/market";

export function cmfTone(cmf: number): string {
  if (cmf > 0.1) return "text-emerald-400 light:text-emerald-600";
  if (cmf < -0.1) return "text-red-400 light:text-red-600";
  return "text-zinc-400 light:text-zinc-500";
}

function cmfLabel(cmf: number): string {
  if (cmf > 0.1) return "Buying pressure";
  if (cmf < -0.1) return "Selling pressure";
  return "Neutral";
}

function obvMeta(trend: MoneyFlow["obvTrend"]): { arrow: string; label: string; cls: string } {
  if (trend === "rising")
    return { arrow: "▲", label: "Rising", cls: "text-emerald-400 light:text-emerald-600" };
  if (trend === "falling")
    return { arrow: "▼", label: "Falling", cls: "text-red-400 light:text-red-600" };
  return { arrow: "▬", label: "Flat", cls: "text-zinc-400 light:text-zinc-500" };
}

function fmtSigned(n: number, digits = 2): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;
}

/** Money-flow panel: descriptive volume/pressure indicators from the last
 *  20 trading days. Educational — describes what happened, not what's next. */
export default function MoneyFlowPanel({ mf }: { mf: MoneyFlow }) {
  const markerPct = ((mf.cmf20 + 1) / 2) * 100;
  const obv = obvMeta(mf.obvTrend);

  return (
    <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-4 light:border-zinc-200 light:bg-white sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Money flow
        </h2>
        <span className="text-xs text-zinc-500">20 trading days · as of {mf.asOf}</span>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        {/* Chaikin Money Flow */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Buying vs selling
          </div>
          <div className={`tnum mt-1.5 text-lg font-extrabold ${cmfTone(mf.cmf20)}`}>
            {fmtSigned(mf.cmf20)} · {cmfLabel(mf.cmf20)}
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-red-500/70 via-zinc-600 to-emerald-500/70">
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded bg-white shadow"
              style={{ left: `calc(${markerPct.toFixed(1)}% - 2px)` }}
              aria-hidden
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
            <span>-1 selling</span>
            <span>0</span>
            <span>+1 buying</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400 light:text-zinc-600">
            Chaikin Money Flow: whether buying or selling pressure dominated the
            last 20 days, weighted by how much stock changed hands.
          </p>
        </div>

        {/* On-Balance Volume trend */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Volume direction
          </div>
          <div className={`tnum mt-1.5 text-lg font-extrabold ${obv.cls}`}>
            {obv.arrow} {obv.label}
            <span className="ml-2 text-sm font-bold text-zinc-400 light:text-zinc-500">
              {fmtSigned(mf.obvVsAvgPct, 1)}%
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400 light:text-zinc-600">
            On-Balance Volume adds up volume on up-days and subtracts it on
            down-days. Rising means volume has been flowing into the stock
            relative to its 20-day average.
          </p>
        </div>

        {/* Unusual volume */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Today&apos;s volume
          </div>
          <div
            className={`tnum mt-1.5 text-lg font-extrabold ${
              mf.unusualVolume
                ? "text-amber-300 light:text-amber-700"
                : "text-zinc-200 light:text-zinc-800"
            }`}
          >
            {mf.volRatio.toFixed(1)}× average
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400 light:text-zinc-600">
            {mf.unusualVolume
              ? "Unusual — today's trading is well above the 20-day average. Volume spikes often accompany news."
              : "Normal — today's trading is in line with the 20-day average."}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-white/5 pt-3 text-xs leading-relaxed text-zinc-500 light:border-zinc-100">
        These indicators describe what already happened — heavy buying pressure
        last month doesn't mean the price goes up next month. For learning, not
        for trading decisions.
      </p>
    </div>
  );
}
