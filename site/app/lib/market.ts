import marketFile from "../../data/market.json";
import universeFile from "../../data/universe.json";

export type HistPoint = { date: string; close: number };

export type Instrument = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  history: HistPoint[];
};

type MarketFile = {
  generated: string;
  disclaimer: string;
  indices: Instrument[];
};
type UniverseFile = {
  generated: string;
  disclaimer: string;
  stocks: Instrument[];
};

const market = marketFile as MarketFile;
const universe = universeFile as UniverseFile;

export const indices: Instrument[] = market.indices;
export const stocks: Instrument[] = universe.stocks;
export const generatedAt: string = market.generated;
export const disclaimerText: string = market.disclaimer;

export const bySymbol: Record<string, Instrument> = {};
for (const s of stocks) bySymbol[s.symbol] = s;
for (const i of indices) bySymbol[i.symbol] = i;

/** Latest trading date present in the data (YYYY-MM-DD). */
export const latestDate: string =
  indices[0]?.history[indices[0].history.length - 1]?.date ?? "";

/** Build an SVG polyline path for a series of closes. */
export function sparkPath(
  history: HistPoint[],
  w: number,
  h: number,
  pad = 2
): { line: string; area: string } {
  if (history.length < 2) return { line: "", area: "" };
  const closes = history.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (closes.length - 1)) * (w - 2 * pad);
  const y = (c: number) => pad + (1 - (c - min) / span) * (h - 2 * pad);
  const pts = closes.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`);
  return {
    line: `M${pts.join(" L")}`,
    area: `M${x(0).toFixed(1)},${h} L${pts.join(" L")} L${x(closes.length - 1).toFixed(1)},${h} Z`,
  };
}

/** 52-week high/low computed from the 1y history. */
export function yearRange(history: HistPoint[]): { high: number; low: number } {
  const closes = history.map((p) => p.close);
  return { high: Math.max(...closes), low: Math.min(...closes) };
}

/** % change from first to last close in history (approx 1y return). */
export function yearReturn(history: HistPoint[]): number {
  if (history.length < 2) return 0;
  return ((history[history.length - 1].close / history[0].close) - 1) * 100;
}
