"""Wild Day CPI-day diagnostic (Step 0) — pre-registered 2026-10-13.

Scope: CPI-DIAGNOSTIC-SCOPE.md (written before any numbers were run).
This script implements exactly the pre-registered metrics and decision
rule. It makes NO model change.

Calendar construction (all BLS primary-source material):
  - Base map: reference-month -> release-date parsed from archived
    snapshots of BLS's own CPI schedule page (fetch_cpi_dates.py;
    later snapshots overwrite earlier ones, so slipped dates land on
    their actual day).
  - Patch 1: April reference months. BLS prints May release dates
    without a period ("May 12"), which the schedule parser originally
    missed for Apr 2016/2018-2026. Those dates are taken from BLS's
    release-archive filename index (data/cpi_archive_urls.txt) — the
    unique May archive date not already claimed by the schedule map.
  - Patch 2: October 2025. The schedule map's last-seen date
    (2025-11-13) was the pre-shutdown schedule for a report that was
    never published standalone (BLS removed the row; no archived
    release exists). Removed — there was no Oct-2025 CPI tape day.
  - Residual caveat: a handful of archive filenames sit one day off a
    schedule-confirmed release (e.g. cpi_10112024 vs the Oct 10, 2024
    release). The schedule page, confirmed post-release, is treated as
    authoritative; any residual one-day mislabels are ~4 of ~128 days
    and bias toward the null, not toward a false gap.

Trading-day mapping: a release date that is not a trading day in
predictions.csv (e.g. Good Friday 2020-04-10, NYSE closed) is mapped
to the NEXT trading day — the session that actually traded on it.
"""
import csv
import math
import re
from datetime import date

BASE = "data/cpi_release_dates.csv"
ARCHIVE = "data/cpi_archive_urls.txt"
PREDS = "predictions.csv"


def load_archive_dates():
    out = set()
    for line in open(ARCHIVE):
        m = re.search(r"cpi_(\d{2})(\d{2})(\d{4})\.(?:htm|pdf)", line)
        if m:
            try:
                out.add(date(int(m.group(3)), int(m.group(1)),
                             int(m.group(2))))
            except ValueError:
                pass
    return out


def build_calendar(archive):
    cal = {}  # reference (y, m) -> release date
    for r in csv.DictReader(open(BASE)):
        y, m = map(int, r["reference_month"].split("-"))
        cal[(y, m)] = date.fromisoformat(r["release_date"])
    claimed = set(cal.values())
    patched = []
    for y in range(2016, 2027):
        if (y, 4) not in cal:
            cands = sorted(d for d in archive
                           if d.year == y and d.month == 5
                           and d not in claimed)
            assert len(cands) == 1, f"April {y}: candidates {cands}"
            cal[(y, 4)] = cands[0]
            claimed.add(cands[0])
            patched.append(((y, 4), cands[0]))
    removed = cal.pop((2025, 10), None)
    return cal, patched, removed


def wilson(k, n, z=1.96):
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    den = 1 + z * z / n
    ctr = (p + z * z / (2 * n)) / den
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (ctr - half, ctr + half)


def brier(rows, key):
    return sum((r[key] - r["wild"]) ** 2 for r in rows) / len(rows)


def main():
    archive = load_archive_dates()
    cal, patched, removed = build_calendar(archive)
    print("calendar: reference months =", len(cal))
    print("April patches (from BLS archive index):",
          [(f"{y}-{m:02d}", str(d)) for (y, m), d in patched])
    print("removed Oct-2025 stale entry:", removed)
    expected = [(y, m) for y in range(2016, 2027)
                for m in range(1, 13) if (2016, 1) <= (y, m) <= (2026, 8)]
    # (2025, 10) is the one intentional exclusion: never released.
    missing = [e for e in expected
               if e not in cal and e != (2025, 10)]
    print("missing reference months in 2016-01..2026-08:", missing,
          "(excluding Oct 2025, never released)")
    assert not missing

    preds = []
    for r in csv.DictReader(open(PREDS)):
        preds.append({
            "date": date.fromisoformat(r["date"]),
            "wild": float(r["wild"]),
            "model": float(r["model"]),
            "persist": float(r["persist"]),
            "viximp": float(r["viximp"]),
        })
    trade_days = sorted(p["date"] for p in preds)
    td_set = set(trade_days)

    cpi_days, remapped = set(), []
    for rel in sorted(set(cal.values())):
        if rel < trade_days[0] or rel > trade_days[-1]:
            continue
        if rel in td_set:
            cpi_days.add(rel)
        else:
            nxt = next(d for d in trade_days if d > rel)
            cpi_days.add(nxt)
            remapped.append((str(rel), str(nxt)))
    print("release dates in window mapped to trading days:",
          len(cpi_days), "| remapped (non-trading release day):", remapped)

    cpi = [p for p in preds if p["date"] in cpi_days]
    non = [p for p in preds if p["date"] not in cpi_days]
    n_c, n_n = len(cpi), len(non)
    wild_c = sum(p["wild"] for p in cpi)
    rate_c = wild_c / n_c
    rate_n = sum(p["wild"] for p in non) / n_n
    rate_all = sum(p["wild"] for p in preds) / len(preds)
    mean_model_c = sum(p["model"] for p in cpi) / n_c
    gap = rate_c - mean_model_c
    lo, hi = wilson(int(wild_c), n_c)
    b_c_model, b_c_pers = brier(cpi, "model"), brier(cpi, "persist")
    b_n_model, b_n_pers = brier(non, "model"), brier(non, "persist")
    mean_vix_c = sum(p["viximp"] for p in cpi) / n_c

    print(f"\nCPI days n={n_c} (wild {int(wild_c)}), non-CPI n={n_n}")
    print(f"wild rate: CPI {rate_c:.3f} | non-CPI {rate_n:.3f} | "
          f"overall {rate_all:.3f}")
    print(f"mean model prob on CPI days: {mean_model_c:.3f}")
    print(f"calibration gap: {gap:+.3f} ({gap*100:+.1f} pp); "
          f"Wilson 95% CI on CPI wild rate: [{lo:.3f}, {hi:.3f}]")
    print(f"Brier CPI days: model {b_c_model:.4f} vs persistence "
          f"{b_c_pers:.4f} (skill {1 - b_c_model / b_c_pers:+.3f})")
    print(f"Brier non-CPI:  model {b_n_model:.4f} vs persistence "
          f"{b_n_pers:.4f} (skill {1 - b_n_model / b_n_pers:+.3f})")
    print(f"mean VIX-implied on CPI days: {mean_vix_c:.3f} "
          f"(model {mean_model_c:.3f})")

    cond_gap = gap >= 0.08
    cond_brier = b_c_model > b_c_pers
    print(f"\ndecision rule: gap >= +8pp? {cond_gap} | "
          f"model Brier worse than persistence on CPI days? {cond_brier}")
    print("VERDICT:",
          "GAP — Step-1 pre-registration justified"
          if (cond_gap and cond_brier) else
          "NO GAP worth chasing — publish as null, no variant test")


if __name__ == "__main__":
    main()
