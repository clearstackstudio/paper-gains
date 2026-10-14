# Wild Day — Jobs-report-day diagnostic (Step 0), pre-registered 2026-10-13

Written BEFORE any jobs-day numbers were computed. This is the sibling
hypothesis the CPI diagnostic explicitly left out of its scope
(CPI-DIAGNOSTIC-SCOPE.md: "Jobs-report days get their own
pre-registration rather than being folded in after the fact"). The CPI
diagnostic returned NO GAP (CPI-DIAGNOSTIC-RESULTS.md). Bryant approved
writing this scope on 2026-10-13; running it is a separate approval.

## Question

On Employment Situation ("jobs report") release days inside the
2016–2026 walk-forward test window, did wild days happen more often
than the Wild Day model predicted? I.e., is there a jobs-day blind
spot large enough to justify a Step-1 variant test?

This is a diagnostic only. **No model change can result from Step 0**,
whatever it shows.

## Data

- Saved walk-forward predictions: `predictions.csv` (2,708 trading
  days, 2016-01-04..2026-10-09; date, wild outcome, model prob,
  climatology, persistence, VIX-implied) — the same artifact the CPI
  diagnostic used, so the two studies are directly comparable.
- Jobs-report release dates: ACTUAL release dates from the U.S.
  Bureau of Labor Statistics, primary source only, built the same way
  as the CPI calendar: archived snapshots of BLS's own Employment
  Situation schedule page (306 usable snapshots, 2016–2026, confirmed
  available 2026-10-13), later snapshots overwriting earlier ones,
  cross-checked against BLS's release-archive filename index
  (`empsit_MMDDYYYY`). Collection will be throttled — archive.org
  rate-limited the CPI build after ~100 rapid fetches.
- Jobs-specific wrinkles, decided now:
  - The report usually lands the first Friday of the month at
    8:30 AM ET but shifts around federal holidays; no date is ever
    assumed from the pattern — every date comes from BLS material.
  - The late-2025 federal shutdown delayed Employment Situation
    releases and at least one month was never published as a normal
    standalone report. Same handling as CPI's October 2025: a month
    with no actual release has no tape day; exclusions are documented
    in the results, never silently filled from the pre-shutdown
    schedule.
  - Jobs days are expected to be disjoint from CPI days (early-month
    Fridays vs mid-month) and from FOMC announcement days — so a
    jobs-day effect cannot be a disguised CPI or Fed effect. This is
    to be VERIFIED in the run and reported, not assumed.
  - Releases on non-trading days (e.g. Good Friday) map to the next
    trading day, exactly as in the CPI diagnostic.
  - Sanity check before analysis: expect ~12 releases per year,
    ~125–129 in-window. The joined date list and its sources are
    saved alongside the results so the join is auditable.

## Metrics (identical to the CPI diagnostic — no new ones)

1. Jobs-day count in window; wild-day rate on jobs days vs non-jobs
   days vs the overall 23.78%.
2. Calibration gap on jobs days: realized wild rate minus mean model
   probability on jobs days, with a 95% Wilson interval on the
   realized rate.
3. Brier score on jobs days only: model vs persistence. Same pair on
   non-jobs days for context.
4. Mean VIX-implied probability on jobs days vs the model —
   descriptive context only.

For context, the results memo will place the jobs-day table beside
the already-published CPI-day table. No pooled "all report days"
metric will be computed or treated as a finding — that would be a
new hypothesis requiring its own pre-registration.

## Decision rule — what counts as "a real gap" (identical bars)

Proceed to a Step-1 pre-registration (a report-day-flag model variant
judged by the ORIGINAL adoption bars from Volatility-Model-Scope.md,
full walk-forward refit, Bryant's approval required before anything
ships) only if BOTH hold:

- the jobs-day calibration gap (metric 2) is ≥ +8 percentage points,
  AND
- model Brier on jobs days is worse than persistence Brier on jobs
  days (negative subset skill).

If either fails: verdict is NO GAP worth chasing. The diagnostic is
published as a null result alongside the study files, no variant is
tested, and the live model is untouched.

## Guardrails

- One hypothesis, one diagnostic. A "gap" here buys only a
  pre-registered Step-1 test, never a model change.
- If both this and the CPI diagnostic return nulls, the report-day
  question is considered settled for this model generation; reopening
  it requires new live evidence (e.g. report days visibly landing wild
  in the live grading record), not another slice of the same
  backtest.
- FOMC-day performance is already inside the model (FOMC is a model
  input); it is not re-tested here.
- Whatever the result, it gets written up in
  `JOBS-DIAGNOSTIC-RESULTS.md` next to this scope, including if null.
