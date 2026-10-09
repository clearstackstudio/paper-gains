"use client";

import { useMemo } from "react";
import { fmtPrice } from "../lib/format";
import type { HistPoint } from "../lib/market";

/** Larger 1-year price chart with y-axis ticks and date labels. */
export default function PriceChart({ history }: { history: HistPoint[] }) {
  const W = 720, H = 300, PAD_L = 56, PAD_R = 12, PAD_T = 12, PAD_B = 28;

  const { line, area, ticks, firstLabel, lastLabel } = useMemo(() => {
    const closes = history.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const x = (i: number) =>
      PAD_L + (i / (closes.length - 1)) * (W - PAD_L - PAD_R);
    const y = (c: number) =>
      PAD_T + (1 - (c - min) / span) * (H - PAD_T - PAD_B);
    const pts = closes.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`);
    const up = closes[closes.length - 1] >= closes[0];
    const ticks = [0, 1, 2, 3].map((i) => {
      const v = min + (span * i) / 3;
      return { v, y: y(v) };
    });
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lbl = (d: string) => {
      const [yy, mm] = d.split("-").map(Number);
      // "Oct ’25" — unambiguous month + year (never bare "Oct 25", which reads as a day).
      return `${MONTHS[mm - 1]} ’${String(yy).slice(2)}`;
    };
    return {
      line: `M${pts.join(" L")}`,
      area: `M${x(0).toFixed(1)},${H - PAD_B} L${pts.join(" L")} L${x(closes.length - 1).toFixed(1)},${H - PAD_B} Z`,
      ticks,
      firstLabel: lbl(history[0].date),
      lastLabel: lbl(history[history.length - 1].date),
      up,
    };
  }, [history]);

  const up = history[history.length - 1].close >= history[0].close;
  const stroke = up ? "#22c55e" : "#ef4444";
  const fill = up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="One-year price chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray={i === 0 ? "" : "4 4"}
          />
          <text
            x={PAD_L - 8}
            y={t.y + 4}
            textAnchor="end"
            fontSize="11"
            className="fill-zinc-500 light:fill-zinc-500"
          >
            {fmtPrice(t.v)}
          </text>
        </g>
      ))}
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      <text x={PAD_L} y={H - 8} fontSize="11" className="fill-zinc-500">
        {firstLabel}
      </text>
      <text x={W - PAD_R} y={H - 8} fontSize="11" textAnchor="end" className="fill-zinc-500">
        {lastLabel}
      </text>
    </svg>
  );
}
