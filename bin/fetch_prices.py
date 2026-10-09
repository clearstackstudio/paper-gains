#!/usr/bin/env python3
"""Paper Gains daily price pipeline — Yahoo Finance (free, no key).

Fetches 1y daily closes for market indices + the pick'em stock universe,
writes site/data/market.json and site/data/universe.json.

Run daily after market close. Idempotent.
"""
import json
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "site" / "data"
UA = {"User-Agent": "Mozilla/5.0 (compatible; PaperGains/1.0)"}

INDICES = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "Nasdaq"),
    ("^DJI", "Dow Jones"),
]

# 30 liquid large-caps across sectors — the pick'em universe (v1)
UNIVERSE = [
    ("AAPL", "Apple"), ("MSFT", "Microsoft"), ("NVDA", "NVIDIA"),
    ("AMZN", "Amazon"), ("META", "Meta"), ("GOOGL", "Alphabet"),
    ("TSLA", "Tesla"), ("AVGO", "Broadcom"), ("BRK-B", "Berkshire Hathaway"),
    ("JPM", "JPMorgan Chase"), ("V", "Visa"), ("XOM", "Exxon Mobil"),
    ("UNH", "UnitedHealth"), ("MA", "Mastercard"), ("COST", "Costco"),
    ("HD", "Home Depot"), ("PG", "Procter & Gamble"), ("NFLX", "Netflix"),
    ("CRM", "Salesforce"), ("AMD", "AMD"), ("DIS", "Disney"),
    ("KO", "Coca-Cola"), ("ABBV", "AbbVie"), ("PFE", "Pfizer"),
    ("MRK", "Merck"), ("WMT", "Walmart"), ("BAC", "Bank of America"),
    ("ORCL", "Oracle"), ("ADBE", "Adobe"), ("QCOM", "Qualcomm"),
]


def fetch_daily(symbol: str) -> dict | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1y"
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.load(r)
    except Exception as e:
        print(f"  !! {symbol}: {e}", file=sys.stderr)
        return None
    try:
        res = d["chart"]["result"][0]
        ts = res["timestamp"]
        q = res["indicators"]["quote"][0]
        closes = q["close"]
        opens = q.get("open") or []
        highs = q.get("high") or []
        lows = q.get("low") or []
        vols = q.get("volume") or []
        adj = res["indicators"].get("adjclose", [{}])[0].get("adjclose")
        prices = adj or closes
        hist = []
        for i, (t, c) in enumerate(zip(ts, prices)):
            if c is None:
                continue
            pt = {"date": datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d"),
                  "close": round(c, 2)}
            # Full OHLCV for money-flow indicators; backward compatible —
            # existing readers only need date/close.
            o = opens[i] if i < len(opens) else None
            h = highs[i] if i < len(highs) else None
            l = lows[i] if i < len(lows) else None
            v = vols[i] if i < len(vols) else None
            if o is not None:
                pt["open"] = round(o, 2)
            if h is not None:
                pt["high"] = round(h, 2)
            if l is not None:
                pt["low"] = round(l, 2)
            if v is not None:
                pt["volume"] = int(v)
            hist.append(pt)
        if len(hist) < 2:
            return None
        price = hist[-1]["close"]
        prev = hist[-2]["close"]
        return {
            "symbol": symbol,
            "name": res["meta"].get("longName") or res["meta"].get("shortName") or symbol,
            "price": price,
            "change": round(price - prev, 2),
            "changePct": round((price - prev) / prev * 100, 2),
            "history": hist,
        }
    except (KeyError, IndexError, TypeError) as e:
        print(f"  !! {symbol}: parse error {e}", file=sys.stderr)
        return None


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()

    print("indices…")
    indices = []
    for sym, name in INDICES:
        d = fetch_daily(sym)
        time.sleep(0.4)
        if d:
            d["name"] = name
            indices.append(d)
            print(f"  {sym}: {d['price']} ({d['changePct']:+.2f}%)")
    (OUT_DIR / "market.json").write_text(json.dumps(
        {"generated": now, "disclaimer": "Delayed/indicative data for education only. Not financial advice.",
         "indices": indices}, indent=1))

    print("universe…")
    stocks = []
    for sym, name in UNIVERSE:
        d = fetch_daily(sym)
        time.sleep(0.4)
        if d:
            d["name"] = name
            stocks.append(d)
            print(f"  {sym}: {d['price']} ({d['changePct']:+.2f}%)")
    (OUT_DIR / "universe.json").write_text(json.dumps(
        {"generated": now, "disclaimer": "Delayed/indicative data for education only. Not financial advice.",
         "stocks": stocks}, indent=1))

    print(f"done: {len(indices)} indices, {len(stocks)} stocks")
    return 0 if indices and stocks else 1


if __name__ == "__main__":
    sys.exit(main())
