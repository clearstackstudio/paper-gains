"use client";

import { sparkPath, type HistPoint } from "../lib/market";

export default function Sparkline({
  history,
  width = 120,
  height = 36,
  positive,
}: {
  history: HistPoint[];
  width?: number;
  height?: number;
  positive?: boolean;
}) {
  const up =
    positive ?? history[history.length - 1].close >= history[0].close;
  const { line, area } = sparkPath(history, width, height);
  const stroke = up ? "#22c55e" : "#ef4444";
  const fill = up ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
      role="img"
      aria-label="Price trend"
    >
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
