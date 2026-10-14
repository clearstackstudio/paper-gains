# Wild Day — CPI-day diagnostic (Step 0), results 2026-10-13

Pre-registration: `CPI-DIAGNOSTIC-SCOPE.md` (written and committed to
before any CPI-day numbers were computed). Code: `cpi_diagnostic.py`.
**Verdict: NO GAP. No variant test, no model change.** The live model
stays exactly as launched; the FOMC-only limitation stays disclosed
on the page, but the evidence says CPI days are not a blind spot in
the 2016–2026 data.

## The numbers (exactly the pre-registered metrics)

Window: the saved walk-forward predictions, 2,708 trading days,
2016-01-04..2026-10-09. CPI trading days identified: **128**
(27 of them wild).

1. **Wild-day rate.** CPI days **21.1%** vs non-CPI days 23.9% vs
   overall 23.8%. CPI days were, if anything, slightly *calmer* than
   average in this window.
2. **Calibration gap.** Mean model probability on CPI days: 24.3%.
   Realized: 21.1%. Gap = **−3.2 pp** (the model slightly
   *over*-predicts CPI days). Wilson 95% CI on the realized CPI-day
   rate: [14.9%, 29.0%] — the model's average prediction sits
   comfortably inside it.
3. **Brier on CPI days.** Model **0.1450** vs persistence 0.1471 —
   the model still beats its rival on CPI days (subset skill +1.5%,
   vs +8.0% on non-CPI days). No sign of the model falling apart
   precisely where it was supposed to be blind.
4. **Descriptive context.** Mean VIX-implied probability on CPI days:
   36.5%, against a 21.1% realized rate. The options market charges a
   large CPI-day premium that, over this decade, did not correspond
   to ≥1% SPY moves arriving more often than the model expected.

Decision rule check (both conditions required for a Step-1 test):
gap ≥ +8 pp? **No (−3.2 pp).** Model Brier worse than persistence on
CPI days? **No.** → NO GAP, per the pre-registration. Nothing ships.

Honest caveat: n=128 gives a wide interval, so a small true CPI
effect (under ~+8 pp) cannot be ruled out. But the point estimates
lean the other way on both tests, so there is nothing here to chase.
If live CPI days start landing wild at a visibly higher rate, the
live grading record will show it and the question can be reopened
with live data.

## Calendar construction (auditable)

All dates from BLS primary-source material; no third-party calendar.

- Base: reference-month → release-date parsed from Wayback snapshots
  of BLS's own CPI schedule page (`fetch_cpi_dates.py`); later
  snapshots overwrite earlier ones, so slipped dates (late-2025
  shutdown) land on their actual day. Base map: 124 reference months.
- April patch: BLS prints May dates without a period ("May 12"),
  which the parser originally missed for Apr 2016 and Apr 2018–2026.
  Those 10 dates came from BLS's release-archive filename index
  (`data/cpi_archive_urls.txt`) — each is the unique unclaimed May
  archive date of its year (e.g. Apr 2022 → 2022-05-11).
- October 2025 removed: the schedule map's last-seen 2025-11-13 was
  the pre-shutdown slot for a report BLS never published standalone
  (the row was later removed; no archived release exists). There was
  no Oct-2025 CPI tape day. (Neighbors check out: Sep 2025 →
  2025-10-24, Nov 2025 → 2025-12-18, both as actually released.)
- Trading-day mapping: releases on non-trading days map to the next
  trading day — exactly two cases, both Good Friday: 2017-04-14 →
  2017-04-17 and 2020-04-10 → 2020-04-13.
- Residual caveat: a few archive filenames sit one day after a
  schedule-confirmed release (e.g. cpi_10112024 vs the Oct 10, 2024
  release). The post-release schedule page is treated as
  authoritative. Any residual one-day mislabels are ~4 of 128 days
  and bias toward the null, not toward a false gap.

Final calendar: 128 reference months with releases in-window
(2016-01..2026-08, Oct 2025 excluded as never released), saved in
`data/cpi_release_dates.csv` (base map) with the patches applied in
`cpi_diagnostic.py`.
