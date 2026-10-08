#!/usr/bin/env python3
"""Generate Mockfolio Model weekly picks: top-5 trailing 20-trading-day momentum.

Picks for ISO week W are chosen at the close of the Friday before W
(prevFridayOfWeek), using only data available at that close. No lookahead.

Usage:
  bin/generate_model_picks.py --backfill    # rebuild full history from data
  bin/generate_model_picks.py --week auto   # add picks for the upcoming ISO week
  bin/generate_model_picks.py --week 2026-W42

Writes site/data/model_picks.json (appends; never deletes weeks).
"""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta, timezone

REPO = "/home/hatch/workspace/paper-gains"
DATA = f"{REPO}/site/data"
OUT = f"{DATA}/model_picks.json"
TRAIL_DAYS = 20
N_PICKS = 5
STRATEGY = (
    "Top-5 trailing 20-trading-day momentum: each week the model buys the 5 stocks "
    "with the best 20-trading-day return as of the previous Friday's close and holds "
    "them one week. Mechanical rule, no human override, no lookahead."
)


def load(path):
    with open(path) as f:
        return json.load(f)


def iso_weeks_between(start: date, end: date):
    """Yield ISO week keys (YYYY-Www) for weeks whose Monday falls in [start, end]."""
    d = start - timedelta(days=start.weekday())  # Monday on or before start
    seen = set()
    while d <= end:
        y, w, _ = d.isocalendar()
        key = f"{y}-W{w:02d}"
        if key not in seen:
            seen.add(key)
            yield key, d
        d += timedelta(days=7)


def monday_of(key: str) -> date:
    y, w = key.split("-W")
    return date.fromisocalendar(int(y), int(w), 1)


def picks_for_week(key: str, dates, closes) -> dict | None:
    """Compute picks for ISO week key, or None if insufficient history."""
    prev_fri = monday_of(key) - timedelta(days=3)
    # latest trading day on or before prev Friday (handles holidays)
    pick_dates = [d for d in dates if d <= prev_fri.isoformat()]
    if len(pick_dates) <= TRAIL_DAYS:
        return None
    pick_date = pick_dates[-1]
    base_date = pick_dates[-1 - TRAIL_DAYS]
    ranked = []
    for sym, c in closes.items():
        if c.get(pick_date) and c.get(base_date):
            ranked.append((c[pick_date] / c[base_date] - 1, sym))
    if len(ranked) < N_PICKS:
        return None
    ranked.sort(reverse=True)
    return {"picks": [s for _, s in ranked[:N_PICKS]], "picked_at": pick_date}


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--backfill", action="store_true")
    g.add_argument("--week", default=None)
    a = ap.parse_args()

    universe = load(f"{DATA}/universe.json")
    stocks = universe["stocks"]
    dates = sorted({h["date"] for s in stocks for h in s["history"]})
    closes = {s["symbol"]: {h["date"]: h["close"] for h in s["history"]} for s in stocks}

    try:
        existing = load(OUT)
        weeks = existing.get("weeks", {})
    except FileNotFoundError:
        weeks = {}

    if a.backfill:
        first = date.fromisoformat(dates[TRAIL_DAYS]) + timedelta(days=7)
        last = date.fromisoformat(dates[-1])
        targets = [k for k, _ in iso_weeks_between(first, last)]
    else:
        if a.week == "auto":
            # upcoming ISO week (the one starting next Monday)
            today = datetime.now(timezone.utc).date()
            nxt_mon = today + timedelta(days=7 - today.weekday())
            y, w, _ = nxt_mon.isocalendar()
            targets = [f"{y}-W{w:02d}"]
        else:
            targets = [a.week]

    added = 0
    for key in targets:
        if key in weeks:
            print(f"skip {key}: already present")
            continue
        entry = picks_for_week(key, dates, closes)
        if entry is None:
            print(f"skip {key}: insufficient history")
            continue
        weeks[key] = entry
        added += 1
        print(f"{key}: picked {','.join(entry['picks'])} at {entry['picked_at']}")

    out = {
        "strategy": STRATEGY,
        "generated": datetime.now(timezone.utc).isoformat(),
        "weeks": weeks,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    print(f"wrote {OUT}: {len(weeks)} weeks ({added} new)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
