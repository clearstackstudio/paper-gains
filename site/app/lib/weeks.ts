import { bySymbol, latestDate, type HistPoint } from "./market";

const DAY = 86400000;

function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** ISO week key like "2026-W40" for a date. */
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (t.getUTCDay() + 6) % 7; // Mon=0
  t.setUTCDate(t.getUTCDate() - day + 3); // Thursday of this week
  const year = t.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jday = (jan4.getUTCDay() + 6) % 7;
  const firstThu = new Date(jan4);
  firstThu.setUTCDate(jan4.getUTCDate() - jday + 3);
  const week = 1 + Math.round((t.getTime() - firstThu.getTime()) / (7 * DAY));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Monday (UTC) of an ISO week key. */
export function mondayOfWeek(weekKey: string): Date {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) throw new Error(`bad week key ${weekKey}`);
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const jday = (jan4.getUTCDay() + 6) % 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jday + (Number(m[2]) - 1) * 7);
  return monday;
}

export function fridayOfWeek(weekKey: string): string {
  return dayStr(new Date(mondayOfWeek(weekKey).getTime() + 4 * DAY));
}

export function prevFridayOfWeek(weekKey: string): string {
  return dayStr(new Date(mondayOfWeek(weekKey).getTime() - 3 * DAY));
}

/** Human label like "Sep 28 – Oct 4". */
export function weekLabel(weekKey: string): string {
  const mon = mondayOfWeek(weekKey);
  const sun = new Date(mon.getTime() + 6 * DAY);
  const f = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(mon)} – ${f(sun)}`;
}

/** Close on or before a date (handles weekends/holidays). History ascending. */
export function closeOnOrBefore(history: HistPoint[], date: string): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].date <= date) return history[i].close;
  }
  return null;
}

/** % change of a symbol from the previous Friday's close to this week's Friday close. */
export function weeklyReturn(symbol: string, weekKey: string): number | null {
  const inst = bySymbol[symbol];
  if (!inst) return null;
  const start = closeOnOrBefore(inst.history, prevFridayOfWeek(weekKey));
  const end = closeOnOrBefore(inst.history, fridayOfWeek(weekKey));
  if (start == null || end == null || start <= 0) return null;
  return (end / start - 1) * 100;
}

/** A week is gradable once we have data through its Friday. */
export function isWeekComplete(weekKey: string): boolean {
  if (!latestDate) return false;
  return latestDate >= fridayOfWeek(weekKey);
}

export type WeekGrade = {
  weekKey: string;
  complete: boolean;
  perStock: { symbol: string; ret: number | null }[];
  userScore: number | null;
  spx: number | null;
  outperformance: number | null;
};

export function gradePicks(weekKey: string, picks: string[]): WeekGrade {
  const complete = isWeekComplete(weekKey);
  const perStock = picks.map((s) => ({
    symbol: s,
    ret: complete ? weeklyReturn(s, weekKey) : null,
  }));
  const rets = perStock.map((p) => p.ret).filter((r): r is number => r != null);
  const userScore = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : null;
  const spx = complete ? weeklyReturn("^GSPC", weekKey) : null;
  const outperformance =
    userScore != null && spx != null ? userScore - spx : null;
  return { weekKey, complete, perStock, userScore, spx, outperformance };
}

/** Current ISO week key (UTC). */
export function currentWeekKey(now = new Date()): string {
  return isoWeekKey(now);
}
