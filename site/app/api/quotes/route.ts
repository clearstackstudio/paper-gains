import { NextResponse } from "next/server";

// Same 33 symbols as the daily pipeline's universe + indices.
const SYMBOLS = [
  "^GSPC", "^IXIC", "^DJI",
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "AVGO", "BRK-B",
  "JPM", "V", "XOM", "UNH", "MA", "COST", "HD", "PG", "NFLX", "CRM", "AMD",
  "DIS", "KO", "ABBV", "PFE", "MRK", "WMT", "BAC", "ORCL", "ADBE", "QCOM",
];

const UA = "Mozilla/5.0 (compatible; Mockfolio/1.0)";

// Never statically prerender: every request must hit Yahoo for fresh quotes.
export const dynamic = "force-dynamic";

export type Quote = {
  price: number;
  change: number;
  changePct: number;
  marketTime: number; // epoch seconds of the quote
};

// Yahoo's quote endpoint needs a crumb + cookie handshake. Cached in-memory
// (warm invocations reuse it); refreshed when the quote call 401s.
let auth: { cookie: string; crumb: string; at: number } | null = null;

async function yahooAuth(force = false) {
  if (!force && auth && Date.now() - auth.at < 20 * 60 * 1000) return auth;
  const jarRes = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": UA },
  });
  const getSet = (jarRes.headers as Headers & { getSetCookie?: () => string[] })
    .getSetCookie;
  const setCookies = typeof getSet === "function" ? getSet.call(jarRes.headers) : [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error("yahoo cookie handshake failed");
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, Cookie: cookie },
  });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.length > 64 || crumb.includes("error"))
    throw new Error("yahoo crumb fetch failed");
  auth = { cookie, crumb, at: Date.now() };
  return auth;
}

async function fetchQuotes(): Promise<Record<string, Quote>> {
  const doFetch = async () => {
    const { cookie, crumb } = await yahooAuth();
    const url =
      "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
      encodeURIComponent(SYMBOLS.join(",")) +
      "&fields=symbol,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime" +
      "&crumb=" +
      encodeURIComponent(crumb);
    return fetch(url, { headers: { "User-Agent": UA, Cookie: cookie } });
  };

  let res = await doFetch();
  if (res.status === 401) {
    // crumb/cookie expired — refresh once and retry
    auth = null;
    await yahooAuth(true);
    res = await doFetch();
  }
  if (!res.ok) throw new Error(`quote fetch failed: ${res.status}`);
  const data = await res.json();
  const quotes: Record<string, Quote> = {};
  for (const q of data?.quoteResponse?.result ?? []) {
    if (q?.regularMarketPrice == null) continue;
    quotes[q.symbol] = {
      price: q.regularMarketPrice,
      change: q.regularMarketChange ?? 0,
      changePct: q.regularMarketChangePercent ?? 0,
      marketTime: q.regularMarketTime ?? 0,
    };
  }
  return quotes;
}

export async function GET() {
  try {
    const quotes = await fetchQuotes();
    return NextResponse.json({ asOf: Date.now(), quotes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "quote fetch failed" },
      { status: 502 }
    );
  }
}
