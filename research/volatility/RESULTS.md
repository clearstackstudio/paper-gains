# Volatility Model — Backtest Results

_Ran 2026-10-13, exactly as pre-registered in
`~/workspace/goals/paper-gains-stock-tracker-and-pick-em-game/files/Volatility-Model-Scope.md`
(scope written before any model code). Code: `run_backtest.py` in this
folder; every test-day prediction saved in `predictions.csv`._

## Verdict: ADOPT — the pre-registered bar is met on all three prongs

The model predicts the probability that tomorrow is a "wild day" for the
S&P 500 (SPY moving ≥ 1% in either direction), using only information
known at today's close. Walk-forward test: **2016-01-01 → 2026-10-09,
2,708 trading days, 644 wild days (23.8%)**. The model refit monthly on
an expanding window (2010–2015 initial training), never seeing a future
data point.

### Prong 1 — Brier skill > 0 against all three baselines: PASS

| Predictor | Brier score | Model's skill vs it |
|---|---|---|
| **This model** | **0.14612** | — |
| Climatology (expanding base rate) | 0.18158 | **+0.195** |
| Naive persistence (trailing-20d vol) | 0.15825 | **+0.077** |
| VIX-implied | 0.16467 | **+0.113** |

The honest read: beating climatology is easy and beating the VIX is
meaningful, but the number that matters is **+7.7% over naive
persistence** — the dumb "tomorrow will be about as wild as the last 20
days" rule already captures most of volatility clustering, and the
model adds a real, if modest, improvement on top of it. This is the
"small improvement plus better calibration" outcome the scope named as
the realistic prize.

### Prong 2 — Calibration slope within [0.80, 1.25]: PASS

Calibration slope **1.021**, intercept **+0.007** — essentially ideal.
Decile check (mean predicted vs observed wild-day rate): 3.8% → 2.6%,
7.0% → 3.3%, 9.6% → 6.6%, 12.2% → 12.2%, 15.6% → 12.9%, 20.1% → 27.3%,
25.7% → 28.5%, 33.7% → 41.3%, 44.7% → 41.7%, 67.1% → 61.3%. The model
slightly under-predicts in the 18–39% band and slightly over-predicts
at the very top; the overall slope says the published percentages mean
what they say.

### Prong 3 — Positive skill vs persistence in ≥ 7 of 11 test years: PASS, 11/11

2016 +0.087 · 2017 +0.008 · 2018 +0.025 · 2019 +0.157 · 2020 +0.026 ·
2021 +0.202 · 2022 +0.041 · 2023 +0.076 · 2024 +0.032 · 2025 +0.095 ·
2026 +0.079 (through Oct 9). Every year clears, including the two
hardest tests: ultra-calm 2017 (wild rate 3.6%, skill barely positive
at +0.008) and the 2020 crash (42.7% wild). Skill is positive in both
volatility regimes (VIX < 20: +0.066; VIX ≥ 20: +0.087), so the result
is not a single-regime artifact.

### Context metrics (not decision metrics)

- AUC: model **0.791** vs persistence 0.741, VIX 0.781.
- Secondary target (expected |return|, descriptive only): the
  regression model also wins — MAE 0.00459 vs 0.00500 (trailing-vol)
  and 0.00538 (VIX-implied); RMSE 0.00709 vs 0.00762 / 0.00742.

## Deviations from the scope (decided before fitting, recorded in the code)

1. **Event flags are FOMC-only.** BLS blocks this network (HTTP 403),
   so historical CPI / jobs-report calendars could not be obtained
   from a primary source. FOMC announcement days were extracted from
   the Federal Reserve's own calendar pages (current page + two
   archived snapshots) via the official minutes filenames; verified
   counts: exactly 8 scheduled meetings per year 2010–2025, 7 in 2020,
   6 in 2026 through the test end (133 total).
2. **Training starts 2010** instead of 2008 (the Fed calendar page
   history reaches to 2010). Test window unchanged.
3. **The unscheduled 2020 emergency announcements (Mar 3, Mar 15) are
   excluded** from the flags — they were not knowable at the prior
   close, so including them would be lookahead.

## Correction to the scope document

The scope said wild days occur "roughly one day in eight in modern
data." Wrong: in the actual test window they are **23.8% of days —
about one in four** (daily σ averaged ~0.87% across 2016–2026,
including 2020 and 2022). The 1% threshold, features, baselines, and
decision bar never depended on that sentence; it was descriptive prose
and it was off. The scope file carries this correction appended.

## What this does and does not establish

- Established: a simple logistic model on trailing volatility, VIX
  level/term structure, recent big moves, day of week, and FOMC days
  produces **calibrated** wild-day probabilities that beat climatology,
  naive persistence, and the VIX itself, out-of-sample, in every one
  of 11 test years.
- Not established: any ability to predict direction (explicitly not
  the target, and previously shown to be noise on this desk), any
  trading edge, or any options strategy. A 24% base rate also means
  "wild day" is a common event — the product value is the calibrated
  probability and its public record, not clairvoyance.
- Live-use caveats: the model would be refit monthly on the same
  expanding-window rule; probabilities should be recalibration-checked
  monthly like the sports models; the first live months are a
  probationary record, same as any Honest Line launch.

## Recommendation

Build the Mockfolio "Wild day / quiet day" card as scoped: probability
posted before the open, graded the next morning, public track record
with Brier score and calibration chart, methodology page, hard labels
(probability about movement size — never direction, never trading
advice). Build is a separate approval from this verdict.
