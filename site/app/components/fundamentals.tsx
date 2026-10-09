import type { Fundamentals } from "../lib/market";

function fmtPctOrNA(v: number | null, digits = 1): string {
  if (v === null || v === undefined) return "Not available";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(digits)}%`;
}

function metricTone(v: number | null): string {
  if (v === null || v === undefined) return "text-zinc-500";
  return "text-zinc-200 light:text-zinc-800";
}

function Metric({
  label,
  value,
  explain,
}: {
  label: string;
  value: number | null;
  explain: string;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className={`tnum mt-1.5 text-lg font-extrabold ${metricTone(value)}`}>
        {fmtPctOrNA(value)}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400 light:text-zinc-600">
        {explain}
      </p>
    </div>
  );
}

/** Fundamentals snapshot: what the business earned, from SEC filings.
 *  Educational — describes the company, not where the price goes next. */
export default function FundamentalsPanel({ f }: { f: Fundamentals }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-stone-900/60 p-4 light:border-zinc-200 light:bg-white sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Fundamentals
        </h2>
        <span className="text-xs text-zinc-500">{f.asOf} · from SEC filings</span>
      </div>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <Metric
          label="Earnings yield"
          value={f.earningsYield}
          explain="A year's earnings per share divided by the share price — the earnings you get for each dollar invested. Higher means cheaper earnings."
        />
        <Metric
          label="Return on equity"
          value={f.roe}
          explain="A year's net income divided by shareholders' equity — how much profit the company squeezes from each dollar of shareholder money."
        />
      </div>

      <p className="mt-4 border-t border-white/5 pt-3 text-xs leading-relaxed text-zinc-500 light:border-zinc-100">
        Accounting snapshots, not predictions — a cheap-looking stock can stay
        cheap, and a profitable company can still fall. Coverage varies by
        filer; &ldquo;Not available&rdquo; means the filing data wasn&rsquo;t
        clean enough to show honestly. For learning, not for trading decisions.
      </p>
    </div>
  );
}
