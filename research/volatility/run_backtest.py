#!/usr/bin/env python3
"""Volatility model backtest — run exactly as pre-registered in
~/workspace/goals/paper-gains-stock-tracker-and-pick-em-game/files/Volatility-Model-Scope.md

Target: P(|SPY daily return| >= 1%) tomorrow ("wild day"). Inputs known at
today's close. Walk-forward: logistic regression refit monthly on an
expanding window. Test window 2016-01-01 .. 2026-10-09.

Documented deviations (decided 2026-10-13, BEFORE any model was fit):
 1. Event flags: FOMC only. BLS blocks this network (HTTP 403), so
    historical CPI / jobs-report release calendars could not be obtained
    from a primary source. FOMC calendars come from the Federal Reserve
    (current page + two Wayback snapshots of the same official page).
 2. Training starts 2010-01-01 (scope said 2008): the Fed's calendar page
    history reaches back to 2010. Test window unchanged.
 3. Only SCHEDULED FOMC meetings are flagged. The unscheduled emergency
    announcements of 2020-03-03 and 2020-03-15 are excluded: they were not
    knowable at the prior close, so flagging them would be lookahead.
"""
import json, math, re, sys
from pathlib import Path
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
SQRT2 = math.sqrt(2.0)

def Phi(x):
    return 0.5 * (1.0 + math.erf(x / SQRT2))

# ---------------- FOMC calendar ----------------
MONTHS = {m: i + 1 for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"])}
MEET_RE = re.compile(
    r"(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+(\d{1,2})(?:\s*[-\u2013]\s*(?:(January|February|March|April|May|June|July|August|September|October|November|December)\s+)?(\d{1,2}))?")

def parse_fomc():
    # Announcement day = the date in each meeting's official minutes
    # filename (fomcminutesYYYYMMDD.pdf) linked from the Fed's calendar
    # pages. Current page + two Wayback snapshots of the same page give
    # complete coverage 2010-2026: every held meeting produces minutes.
    dates = set()
    for fname in ["fomc.html", "fomc_2021.html", "fomc_2016.html"]:
        html = (DATA / fname).read_text(encoding="utf-8", errors="ignore")
        for y, m, d in re.findall(r"fomcminutes(20\d\d)(\d\d)(\d\d)\.pdf", html):
            dates.add(pd.Timestamp(int(y), int(m), int(d)))
    # exclude unscheduled 2020 emergency announcements (lookahead guard)
    for d in ["2020-03-03", "2020-03-15"]:
        dates.discard(pd.Timestamp(d))
    return sorted(d for d in dates if d.year <= 2026)

# ---------------- Market data ----------------
def load_frame(fomc_dates):
    spy = json.loads((DATA / "spy.json").read_text())
    res = spy["chart"]["result"][0]
    ts = pd.to_datetime(res["timestamp"], unit="s", utc=True).tz_convert("America/New_York")
    adj = res["indicators"]["adjclose"][0]["adjclose"]
    df = pd.DataFrame({"date": ts.normalize().tz_localize(None), "adj": adj}).dropna()
    df = df.drop_duplicates("date").sort_values("date").reset_index(drop=True)
    df["ret"] = df["adj"].pct_change()

    for name in ["vix", "vxv"]:
        f = pd.read_csv(DATA / f"{name}.csv", na_values=".")
        f.columns = ["date", name]
        f["date"] = pd.to_datetime(f["date"])
        df = df.merge(f, on="date", how="left")
    df = df.dropna(subset=["ret", "vix", "vxv"]).reset_index(drop=True)

    r = df["ret"].to_numpy()
    absr = np.abs(r)
    df["abs_ret"] = absr
    def roll_std(w):
        return df["ret"].rolling(w).std(ddof=1)
    df["rv5"], df["rv20"], df["rv60"] = roll_std(5), roll_std(20), roll_std(60)
    df["ewma_vol"] = np.sqrt(pd.Series(r ** 2).ewm(alpha=1 - 0.94, adjust=False).mean()).to_numpy()
    df["max_abs_5"] = df["abs_ret"].rolling(5).max()

    fomc = set(fomc_dates)
    df["is_fomc"] = df["date"].isin(fomc).astype(float)
    df["dow"] = df["date"].dt.dayofweek  # Mon=0

    # Row t = prediction FOR day t, features from data through t-1
    feat_src = pd.DataFrame({
        "log_rv5": np.log(df["rv5"]), "log_rv20": np.log(df["rv20"]),
        "log_rv60": np.log(df["rv60"]), "log_ewma": np.log(df["ewma_vol"]),
        "abs_ret_1": df["abs_ret"], "max_abs_5": df["max_abs_5"],
        "log_vix": np.log(df["vix"]), "vix_slope": df["vix"] - df["vxv"],
        "rv20_raw": df["rv20"], "vix_raw": df["vix"],
        "clim_hist": (df["abs_ret"] >= 0.01).astype(float),
    }).shift(1)
    out = pd.concat([df[["date", "ret", "abs_ret", "dow", "is_fomc"]],
                     feat_src], axis=1)
    out["wild"] = (out["abs_ret"] >= 0.01).astype(float)
    out = out.dropna().reset_index(drop=True)
    out = out[out["date"] >= "2010-01-01"].reset_index(drop=True)
    return out

# ---------------- Models ----------------
FEATURES = ["log_rv5", "log_rv20", "log_rv60", "log_ewma", "abs_ret_1",
            "max_abs_5", "log_vix", "vix_slope", "is_fomc"]

def design(df):
    X = df[FEATURES].to_numpy(dtype=float)
    dow = np.zeros((len(df), 4))  # Tue..Fri (Mon baseline)
    for j, d in enumerate([1, 2, 3, 4]):
        dow[:, j] = (df["dow"].to_numpy() == d).astype(float)
    return np.hstack([X, dow])

def fit_logistic(X, y, l2=1.0, iters=100):
    n, k = X.shape
    mu, sd = X.mean(0), X.std(0)
    sd[sd == 0] = 1.0
    Xs = (X - mu) / sd
    Xa = np.hstack([np.ones((n, 1)), Xs])
    pen = np.concatenate([[0.0], np.full(k, l2)])
    beta = np.zeros(k + 1)
    for _ in range(iters):
        z = Xa @ beta
        p = 1.0 / (1.0 + np.exp(-np.clip(z, -35, 35)))
        g = Xa.T @ (y - p) - pen * beta
        W = p * (1 - p)
        H = (Xa.T * W) @ Xa + np.diag(pen + 1e-9)
        step = np.linalg.solve(H, g)
        beta = beta + step
        if np.max(np.abs(step)) < 1e-9:
            break
    return beta, mu, sd

def pred_logistic(beta, mu, sd, X):
    Xs = (X - mu) / sd
    Xa = np.hstack([np.ones((len(X), 1)), Xs])
    z = Xa @ beta
    return 1.0 / (1.0 + np.exp(-np.clip(z, -35, 35)))

def pred_linear(beta, mu, sd, X):
    Xs = (X - mu) / sd
    Xa = np.hstack([np.ones((len(X), 1)), Xs])
    return Xa @ beta

def fit_ridge(X, y, l2=1.0):
    mu, sd = X.mean(0), X.std(0)
    sd[sd == 0] = 1.0
    Xs = (X - mu) / sd
    Xa = np.hstack([np.ones((len(X), 1)), Xs])
    pen = np.diag(np.concatenate([[0.0], np.full(X.shape[1], l2)]))
    beta = np.linalg.solve(Xa.T @ Xa + pen, Xa.T @ y)
    return beta, mu, sd

def brier(p, y):
    return float(np.mean((p - y) ** 2))

def auc(scores, y):
    order = np.argsort(scores)
    ranks = np.empty(len(scores)); ranks[order] = np.arange(1, len(scores) + 1)
    # average ranks for ties
    s = pd.Series(scores); ranks = s.rank(method="average").to_numpy()
    n1, n0 = y.sum(), len(y) - y.sum()
    return float((ranks[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))

def calib_slope(p, y):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    X = np.column_stack([np.ones(len(p)), np.log(p / (1 - p))])
    beta = np.zeros(2)
    for _ in range(100):
        z = X @ beta
        q = 1.0 / (1.0 + np.exp(-np.clip(z, -35, 35)))
        g = X.T @ (y - q)
        W = q * (1 - q)
        H = (X.T * W) @ X + np.eye(2) * 1e-9
        step = np.linalg.solve(H, g)
        beta += step
        if np.max(np.abs(step)) < 1e-10:
            break
    return float(beta[0]), float(beta[1])  # intercept, slope

def main():
    fomc = parse_fomc()
    by_year = pd.Series([d.year for d in fomc]).value_counts().sort_index()
    print("FOMC announcement days per year:\n", by_year.to_string())
    df = load_frame(fomc)
    df["Xidx"] = np.arange(len(df))
    print(f"\nFrame: {len(df)} rows, {df['date'].min().date()} .. {df['date'].max().date()}")

    test = df[(df["date"] >= "2016-01-01") & (df["date"] <= "2026-10-09")].copy()
    print(f"Test rows: {len(test)}, wild-day rate {100*test['wild'].mean():.2f}%")

    X_all = design(df)
    months = pd.period_range("2016-01", "2026-10", freq="M")
    preds = {k: np.full(len(test), np.nan) for k in
             ["model", "clim", "persist", "viximp", "mag_model", "mag_rv20", "mag_vix"]}
    test_dates = test["date"].to_numpy()
    clim_cum = df.set_index("date")["wild"]  # for expanding climatology

    for m in months:
        mstart = m.start_time
        fit_mask = (df["date"] < mstart) & (df["date"] >= "2010-01-01")
        if fit_mask.sum() < 500:
            continue
        beta, mu, sd = fit_logistic(X_all[fit_mask], df.loc[fit_mask, "wild"].to_numpy())
        rbeta, rmu, rsd = fit_ridge(X_all[fit_mask], df.loc[fit_mask, "abs_ret"].to_numpy())
        sel = (test["date"] >= mstart) & (test["date"] < m.end_time + pd.Timedelta(days=1))
        if not sel.any():
            continue
        t_idx = np.where(sel.to_numpy())[0]
        f_idx = test.iloc[t_idx]["Xidx"].to_numpy()
        preds["model"][t_idx] = pred_logistic(beta, mu, sd, X_all[f_idx])
        preds["mag_model"][t_idx] = np.clip(pred_linear(rbeta, rmu, rsd, X_all[f_idx]), 0, None)
        sub = test.iloc[t_idx]
        hist = clim_cum[clim_cum.index < mstart]
        preds["clim"][t_idx] = hist.mean()
        sig_p = sub["rv20_raw"].to_numpy()
        preds["persist"][t_idx] = [2 * (1 - Phi(0.01 / s)) for s in sig_p]
        sig_v = sub["vix_raw"].to_numpy() / 100.0 / math.sqrt(252)
        preds["viximp"][t_idx] = [2 * (1 - Phi(0.01 / s)) for s in sig_v]
        preds["mag_rv20"][t_idx] = sig_p * math.sqrt(2 / math.pi)
        preds["mag_vix"][t_idx] = sig_v * math.sqrt(2 / math.pi)

    y = test["wild"].to_numpy()
    ok = ~np.isnan(preds["model"])
    y, dates = y[ok], test_dates[ok]
    for k in preds:
        preds[k] = preds[k][ok]
    print(f"Scored test days: {len(y)}  (wild days: {int(y.sum())}, {100*y.mean():.2f}%)")

    B = {k: brier(preds[k], y) for k in ["model", "clim", "persist", "viximp"]}
    print("\nBrier scores (lower is better):")
    for k, v in B.items():
        print(f"  {k:8s} {v:.5f}")
    print("Brier skill of model vs baselines (bar: > 0 vs all three):")
    for k in ["clim", "persist", "viximp"]:
        print(f"  vs {k:8s} {1 - B['model']/B[k]:+.4f}")

    inter, slope = calib_slope(preds["model"], y)
    print(f"\nCalibration: intercept {inter:+.3f}, slope {slope:.3f}  (bar: slope in [0.80, 1.25])")
    qs = pd.qcut(preds["model"], 10, duplicates="drop")
    rel = pd.DataFrame({"bin": qs, "p": preds["model"], "y": y}).groupby("bin", observed=True).agg(
        mean_p=("p", "mean"), obs=("y", "mean"), n=("y", "size"))
    print(rel.to_string(float_format=lambda v: f"{v:.3f}"))

    print(f"\nAUC (context only): model {auc(preds['model'], y):.3f}  "
          f"persist {auc(preds['persist'], y):.3f}  vix {auc(preds['viximp'], y):.3f}")

    yrs = pd.DatetimeIndex(dates).year
    print("\nPer-year Brier skill, model vs persistence (bar: >= 7 of 11 positive):")
    pos = 0
    for yr in sorted(set(yrs)):
        m_ = yrs == yr
        sk = 1 - brier(preds["model"][m_], y[m_]) / brier(preds["persist"][m_], y[m_])
        pos += sk > 0
        print(f"  {yr}: n={m_.sum():4d} wild={100*y[m_].mean():5.2f}%  skill {sk:+.4f}")
    print(f"Positive years: {pos}/11")

    himask = test.iloc[np.where(ok)[0]]["vix_raw"].to_numpy() >= 20
    for lab, m_ in [("VIX<20", ~himask), ("VIX>=20", himask)]:
        sk = 1 - brier(preds["model"][m_], y[m_]) / brier(preds["persist"][m_], y[m_])
        print(f"Regime {lab}: n={m_.sum()} skill vs persist {sk:+.4f}")

    ya = test.iloc[np.where(ok)[0]]["abs_ret"].to_numpy()
    print("\nSecondary target |return| (descriptive only):")
    for k in ["mag_model", "mag_rv20", "mag_vix"]:
        e = preds[k] - ya
        print(f"  {k:9s} MAE {np.mean(np.abs(e)):.5f}  RMSE {np.sqrt(np.mean(e**2)):.5f}")

    out = pd.DataFrame({"date": dates, "wild": y, **{k: preds[k] for k in
                        ["model", "clim", "persist", "viximp"]}})
    out.to_csv(HERE / "predictions.csv", index=False)
    print("\nPredictions saved to predictions.csv")

if __name__ == "__main__":
    main()
