#!/usr/bin/env python3
"""Money-flow indicators for the Mockfolio stock universe.

Reads site/data/universe.json (written by bin/fetch_prices.py, which stores
full OHLCV history), computes per-symbol money-flow indicators, and writes
them back into each stock's "moneyFlow" object. Frontend reads static JSON.

Indicators (all descriptive — they describe what happened, not what happens
next; see the site's disclaimer):
  - CMF(20): Chaikin Money Flow over the last 20 trading days. Range [-1, 1].
    Positive = buying pressure dominated; negative = selling pressure.
  - OBV trend: On-Balance Volume vs its 20-day average. Rising = cumulative
    volume has been flowing into the stock; falling = flowing out.
  - Unusual volume: latest day's volume vs its 20-day average (>= 1.5x).

Run after bin/fetch_prices.py. Idempotent.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNIVERSE = ROOT / "site" / "data" / "universe.json"

CMF_WINDOW = 20
UNUSUAL_VOL_MULT = 1.5


def compute(history: list[dict]) -> dict | None:
    """Compute money-flow indicators from OHLCV history (oldest -> newest)."""
    bars = [h for h in history
            if all(k in h for k in ("open", "high", "low", "close", "volume"))]
    if len(bars) < CMF_WINDOW + 1:
        return None
    recent = bars[-CMF_WINDOW:]

    # --- Chaikin Money Flow ---
    mfv_sum = 0.0
    vol_sum = 0
    for b in recent:
        hi, lo, cl, v = b["high"], b["low"], b["close"], b["volume"]
        rng = hi - lo
        mfm = ((cl - lo) - (hi - cl)) / rng if rng > 0 else 0.0
        mfv_sum += mfm * v
        vol_sum += v
    cmf = mfv_sum / vol_sum if vol_sum > 0 else 0.0

    # --- On-Balance Volume vs 20d average ---
    obv = 0.0
    obv_series = []
    prev_close = bars[0]["close"]
    for b in bars:
        if b["close"] > prev_close:
            obv += b["volume"]
        elif b["close"] < prev_close:
            obv -= b["volume"]
        obv_series.append(obv)
        prev_close = b["close"]
    obv_sma = sum(obv_series[-CMF_WINDOW:]) / CMF_WINDOW
    obv_vs_avg = ((obv - obv_sma) / abs(obv_sma) * 100) if obv_sma != 0 else 0.0
    if obv_vs_avg > 0.5:
        trend = "rising"
    elif obv_vs_avg < -0.5:
        trend = "falling"
    else:
        trend = "flat"

    # --- Unusual volume ---
    vols = [b["volume"] for b in recent]
    avg_vol = sum(vols) / len(vols)
    latest_vol = bars[-1]["volume"]
    vol_ratio = latest_vol / avg_vol if avg_vol > 0 else 1.0

    return {
        "cmf20": round(max(-1.0, min(1.0, cmf)), 3),
        "obvTrend": trend,
        "obvVsAvgPct": round(obv_vs_avg, 1),
        "volRatio": round(vol_ratio, 2),
        "unusualVolume": vol_ratio >= UNUSUAL_VOL_MULT,
        "asOf": bars[-1]["date"],
    }


def main() -> int:
    data = json.loads(UNIVERSE.read_text())
    n = 0
    for s in data["stocks"]:
        mf = compute(s.get("history", []))
        if mf:
            s["moneyFlow"] = mf
            n += 1
        else:
            s.pop("moneyFlow", None)
            print(f"  !! {s['symbol']}: insufficient OHLCV history")
    UNIVERSE.write_text(json.dumps(data, indent=1))
    print(f"money flow computed for {n}/{len(data['stocks'])} stocks")
    return 0 if n else 1


if __name__ == "__main__":
    raise SystemExit(main())
