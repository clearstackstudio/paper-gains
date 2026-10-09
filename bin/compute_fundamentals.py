#!/usr/bin/env python3
"""Fundamentals snapshot for the Mockfolio stock universe.

Fetches SEC EDGAR companyfacts (free, keyless) for the 30-stock universe,
builds a point-in-time quarterly panel, and writes a per-symbol
"fundamentals" snapshot into site/data/universe.json. Frontend reads static
JSON -- same pattern as bin/compute_money_flow.py.

Metrics (all descriptive -- they describe the business, not the future;
see the site's disclaimer):
  - earningsYield: TTM diluted EPS / latest close (higher = cheaper earnings)
  - roe: TTM net income / latest shareholders' equity (profitability)

Profit margin was evaluated and DROPPED: filers tag revenue inconsistently
(banks' "Revenues" is a sub-component; Visa's tagged revenue is ~half the
real figure), so no honest cross-ticker margin exists in machine-tagged
data. EY + ROE only.

Data-quality guardrails (from the 2026-10-09 fundamentals research):
  - 10-Ks don't machine-tag Q4 quarterly numbers, so "TTM" is the last 4
    *tagged* quarters (may skip Q4 for some filers). Labeled honestly.
  - Stale inputs (>5 quarters old) -> the whole snapshot is omitted.
  - Stale equity (>2 years older than the latest income quarter, e.g. QCOM's
    2019 equity) or non-positive equity -> roe is null.
  - Implausible values (|roe| > 200%, |earningsYield| > 100%) -> null.
    Never publish a 300% ROE.
  - Missing concepts (BRK-B/V lack diluted EPS; AMZN lacks Revenues) ->
    that metric is null.

Run monthly (filings land ~40 days after quarter-end). ~31 EDGAR calls at
~0.6s spacing -- well under SEC's 10 req/s. On per-symbol fetch failure the
previous snapshot is kept and a warning is printed.
"""
from __future__ import annotations

import gzip
import json
import time
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNIVERSE = ROOT / "site" / "data" / "universe.json"

UA = {"User-Agent": "Mockfolio/1.0 (https://mockfolio-xi.vercel.app)",
      "Accept-Encoding": "gzip"}
TICKER_MAP_URL = "https://www.sec.gov/files/company_tickers.json"
COMPANYFACTS = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"

REVENUE_CONCEPTS = []  # profit margin dropped: revenue tagging is too
# inconsistent across filers (banks, Visa) for an honest cross-ticker metric
# Max age of the latest income quarter before the snapshot is dropped.
MAX_QUARTERS_OLD = 5
# Equity must be within this window of the latest income quarter end.
# Negative lag = equity filed for a later period (fresher) -- allowed.
MIN_EQUITY_LAG_DAYS = -180
MAX_EQUITY_LAG_DAYS = 2 * 365


def get(url: str):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        data = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            data = gzip.decompress(data)
        return json.loads(data)


def qdate(s: str) -> date:
    return date.fromisoformat(s)


def quarterly_rows(rows: list[dict]) -> list[tuple[str, str, float]]:
    """Flow rows with 60-120d spans; dedupe by period end, keep latest filed."""
    best: dict[str, tuple[str, str, float]] = {}
    for r in rows:
        if not r.get("filed") or "start" not in r:
            continue
        try:
            dur = (qdate(r["end"]) - qdate(r["start"])).days
        except ValueError:
            continue
        if not (60 <= dur <= 120):
            continue
        key = r["end"]
        if key not in best or r["filed"] > best[key][1]:
            best[key] = (r["end"], r["filed"], float(r["val"]))
    return [best[k] for k in sorted(best)]


def point_rows(rows: list[dict]) -> list[tuple[str, str, float]]:
    """Point-in-time rows (no start); dedupe by end, keep latest filed."""
    best: dict[str, tuple[str, str, float]] = {}
    for r in rows:
        if not r.get("filed") or "start" in r:
            continue
        key = r["end"]
        if key not in best or r["filed"] > best[key][1]:
            best[key] = (r["end"], r["filed"], float(r["val"]))
    return [best[k] for k in sorted(best)]


def concept_rows(gaap: dict, concept: str, kind: str):
    if concept not in gaap:
        return []
    rows = [r for u in gaap[concept]["units"].values() for r in u]
    return quarterly_rows(rows) if kind == "q" else point_rows(rows)


def quarter_label(end: str) -> str:
    d = qdate(end)
    return f"12 months ended {d:%b %Y}"


def sane(x: float | None, bound: float) -> float | None:
    if x is None:
        return None
    return round(x, 4) if abs(x) <= bound else None


def snapshot(facts: dict, price: float) -> dict | None:
    """Build the fundamentals snapshot from companyfacts JSON.

    Returns None when the inputs are too stale to show honestly.
    """
    gaap = facts.get("facts", {}).get("us-gaap", {})
    eps = concept_rows(gaap, "EarningsPerShareDiluted", "q")
    ni = concept_rows(gaap, "NetIncomeLoss", "q")
    equity = concept_rows(gaap, "StockholdersEquity", "p")

    if len(ni) < 4:
        return None
    ttm_ni = ni[-4:]
    latest_end = qdate(ttm_ni[-1][0])
    # Drop snapshots whose latest quarter is too old to be useful.
    age_days = (date.today() - latest_end).days
    if age_days > MAX_QUARTERS_OLD * 92:
        return None

    ttm_ni_sum = sum(r[2] for r in ttm_ni)

    # Earnings yield needs 4 quarters of EPS and a price.
    ey = None
    if len(eps) >= 4 and price and price > 0:
        ttm_eps = sum(r[2] for r in eps[-4:])
        ey = sane(ttm_eps / price, 1.0)

    # ROE needs fresh, positive equity. Negative lag (equity for a later
    # period than the income quarters, e.g. different fiscal calendars)
    # is fine; stale equity is not.
    roe = None
    if equity:
        eq_end, _, eq_val = equity[-1]
        lag = (latest_end - qdate(eq_end)).days
        if MIN_EQUITY_LAG_DAYS <= lag <= MAX_EQUITY_LAG_DAYS and eq_val > 0:
            roe = sane(ttm_ni_sum / eq_val, 2.0)

    return {
        "earningsYield": ey,
        "roe": roe,
        "asOf": quarter_label(ttm_ni[-1][0]),
    }


def main() -> int:
    data = json.loads(UNIVERSE.read_text())
    stocks = data["stocks"]

    tickers_json = get(TICKER_MAP_URL)
    cik_by_ticker = {v["ticker"]: str(v["cik_str"]).zfill(10)
                      for v in tickers_json.values()}
    # SEC uses "BRK-B" style already; normalize just in case.
    cik_by_ticker.setdefault("BRK-B",
                             cik_by_ticker.get("BRK.B", ""))

    ok, failed, dropped = 0, 0, 0
    for s in stocks:
        sym = s["symbol"]
        cik = cik_by_ticker.get(sym)
        if not cik:
            print(f"  !! {sym}: no CIK mapping, keeping previous snapshot")
            failed += 1
            continue
        try:
            facts = get(COMPANYFACTS.format(cik=cik))
        except Exception as e:  # noqa: BLE001
            print(f"  !! {sym}: EDGAR fetch failed ({e}), keeping previous")
            failed += 1
            time.sleep(2)
            continue
        price = (s.get("history") or [{}])[-1].get("close") or s.get("price")
        snap = snapshot(facts, price)
        if snap is None:
            s.pop("fundamentals", None)
            print(f"  -- {sym}: inputs too stale, snapshot omitted")
            dropped += 1
        else:
            s["fundamentals"] = snap
            ok += 1
        time.sleep(0.6)
    UNIVERSE.write_text(json.dumps(data, indent=1))
    print(f"fundamentals: {ok} updated, {dropped} omitted (stale), "
          f"{failed} kept previous (fetch issues)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
