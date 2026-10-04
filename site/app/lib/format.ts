/** Shared number formatting. */

export function fmtPrice(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Signed percent, e.g. +1.23% / -0.45% */
export function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

/** Signed price delta, e.g. +3.37 / -1.20 */
export function fmtDelta(n: number): string {
  return `${n >= 0 ? "+" : ""}${fmtPrice(n)}`;
}

export function gainClass(n: number): string {
  return n > 0
    ? "text-green-500 light:text-green-600"
    : n < 0
      ? "text-red-500 light:text-red-600"
      : "text-zinc-400 light:text-zinc-500";
}
