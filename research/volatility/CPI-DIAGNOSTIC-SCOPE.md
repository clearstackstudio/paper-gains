# Wild Day — CPI-day diagnostic (Step 0), pre-registered 2026-10-13

Written BEFORE any CPI-day numbers were computed. Bryant approved this
diagnostic (and a one-day transparency note on the live page) on
2026-10-13, after it was noticed that Wild Day's first official live call
(Wed 2026-10-14, 13.1%) falls on the September CPI release day — a day
type the model does not flag. The original study's event flags are
FOMC-only (documented deviation #1 in RESULTS.md: BLS returned HTTP 403
during the study, so CPI/jobs calendars were never sourced).

## Question

On CPI release days inside the 2016–2026 walk-forward test window, did
wild days happen more often than the Wild Day model predicted? I.e., is
there a CPI-day blind spot large enough to justify a Step-1 variant test?

This is a diagnostic only. **No model change can result from Step 0**,
whatever it shows.

## Data

- Saved walk-forward predictions: `predictions.csv` (2,708 trading days,
  2016-01-04..2026-10-09; columns: date, wild outcome, model prob,
  climatology, persistence, VIX-implied). These predictions were made
  with no CPI knowledge — exactly the right artifact for testing a
  blind spot.
- CPI release dates: ACTUAL release dates (the day the report hit the
  tape) from the U.S. Bureau of Labor Statistics, primary source.
  Scheduled-vs-actual matters: releases slipped during the late-2025
  federal shutdown, and the actual date is the market-relevant one.
  Sanity check before any analysis: expect 12 releases per year,
  ~128 in-window (Jan 2016 through the Aug-2026 report on 2026-09-11;
  the Sep-2026 report on 2026-10-14 is outside the prediction window).
  The joined date list and its source are saved alongside the results
  so the join is auditable.

## Metrics (all pre-specified; no others will be reported as findings)

1. CPI-day count in window; wild-day rate on CPI days vs non-CPI days
   vs the overall 23.78%.
2. Calibration gap on CPI days: realized wild rate minus mean model
   probability on CPI days, with a 95% Wilson interval on the realized
   rate.
3. Brier score on CPI days only: model vs persistence (the model's
   stated rival). Same pair computed on non-CPI days for context.
4. Mean VIX-implied probability on CPI days vs the model — descriptive
   context only (the VIX baseline is not the adoption rival).

Expected small-n reality: ~128 CPI days, ~30 expected wild. Intervals
will be wide; the decision rule below is set with that in mind.

## Decision rule — what counts as "a real gap"

Proceed to a Step-1 pre-registration (a CPI-flag model variant judged
by the ORIGINAL adoption bars from Volatility-Model-Scope.md, full
walk-forward refit, Bryant's approval required before anything ships)
only if BOTH hold:

- the CPI-day calibration gap (metric 2) is ≥ +8 percentage points, AND
- model Brier on CPI days is worse than persistence Brier on CPI days
  (negative subset skill).

If either fails: verdict is NO GAP worth chasing. The diagnostic is
published as a null result alongside the study files, no variant is
tested, and the live model is untouched.

## Guardrails

- Subset analysis is hypothesis-generating. CPI was chosen because the
  FOMC-only limitation was disclosed before launch and tomorrow is a
  CPI day — not by fishing across day-types. Even so, a Step-0 "gap"
  buys only a pre-registered Step-1 test, never a model change.
- Jobs-report (Employment Situation) days are the obvious sibling
  hypothesis. They are OUT of scope here; if CPI shows a gap, jobs days
  get their own pre-registration rather than being folded in after
  the fact.
- Whatever the result, it gets written up in
  `CPI-DIAGNOSTIC-RESULTS.md` next to this scope, including if null.
