#!/usr/bin/env python3
"""Mockfolio Wild Day generator: tomorrow's probability of a "wild day"
(SPY moving >= 1% in either direction), graded in public every day.

Model and discipline are exactly the pre-registered study in
research/volatility/ (scope: goals/paper-gains.../Volatility-Model-Scope.md;
verdict: ADOPT — Brier skill +0.077 vs naive persistence, calibration
slope 1.02, positive skill in 11/11 walk-forward years 2016-2026).

How a run works:
 1. Download SPY (Yahoo adjclose), VIX + VXV (FRED), FOMC calendar (Fed).
 2. Grade the stored prediction against the first trading day after it
    was issued; append the result to the public history.
 3. Refit the logistic model if the calendar month has rolled (monthly
    refit on an expanding window from 2010, as studied); coefficients
    are cached in site/data/wild_day.json between refits.
 4. Issue tomorrow's prediction and write site/data/wild_day.json.

Live-use notes (deviations from the study frame, by necessity):
 - If FRED has not posted today's VIX yet, the latest VIX/VXV are
   carried forward at most one trading day and `vix_asof` records it.
 - A same-day SPY bar is ignored until 16:05 ET (incomplete close).
 - FOMC flags cover SCHEDULED meetings only (Fed calendar page +
   embedded verified schedule through 2027). Unscheduled emergency
   announcements can never be flagged — they are unknowable in advance.
Idempotent: re-running with no new close changes nothing.
"""
from __future__ import annotations

import json, math, re, sys, urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

REPO = Path("/home/hatch/workspace/paper-gains")
OUT = REPO / "site" / "data" / "wild_day.json"
UA = {"User-Agent": "Mozilla/5.0 (Mockfolio wild-day generator)"}
SQRT2 = math.sqrt(2.0)
FEATURES = ["log_rv5", "log_rv20", "log_rv60", "log_ewma", "abs_ret_1",
            "max_abs_5", "log_vix", "vix_slope", "is_fomc"]
# Scheduled FOMC announcement days (2nd day of each meeting), from the
# Federal Reserve's published calendar, eyeball-verified 2026-10-13.
# The live fetch below extends this list when the Fed page is reachable.
FOMC_SCHEDULED = [
    "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-10", "2026-07-29",
    "2026-09-16", "2026-10-28", "2026-12-09",
    "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09", "2027-07-28",
    "2027-09-15", "2027-10-27", "2027-12-08",
]
BACKTEST = {
    "window": "2016-01-01 to 2026-10-09 (walk-forward, monthly refits)",
    "n": 2708, "wild_rate": 0.2378,
    "brier_model": 0.14612, "brier_climatology": 0.18158,
    "brier_persistence": 0.15825, "brier_vix": 0.16467,
    "skill_vs_climatology": 0.1953, "skill_vs_persistence": 0.0766,
    "skill_vs_vix": 0.1126, "calibration_slope": 1.021,
    "calibration_intercept": 0.007, "years_positive": "11 of 11",
    "auc_model": 0.791,
}

def fetch(url: str) -> bytes:
    # curl, not urllib: FRED's graph endpoint stalls urllib reads on this
    # network (observed 2026-10-13) while curl completes in seconds.
    import subprocess, time
    last = None
    for attempt in range(3):
        try:
            r = subprocess.run(
                ["curl", "-sSL", "--fail", "--max-time", "60",
                 "-A", UA["User-Agent"], url],
                capture_output=True, timeout=75)
            if r.returncode == 0 and r.stdout:
                return r.stdout
            last = RuntimeError(f"curl rc={r.returncode}: {r.stderr[:200]!r}")
        except Exception as e:
            last = e
        time.sleep(5 * (attempt + 1))
    raise last

def Phi(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / SQRT2))

# ---------------- FOMC ----------------
def fomc_dates() -> set:
    dates = {pd.Timestamp(d) for d in FOMC_SCHEDULED}
    try:
        html = fetch("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm").decode("utf-8", "ignore")
        for y, m, d in re.findall(r"fomcminutes(20\d\d)(\d\d)(\d\d)\.pdf", html):
            dates.add(pd.Timestamp(int(y), int(m), int(d)))
        for d in ["2020-03-03", "2020-03-15"]:  # unscheduled emergencies
            dates.discard(pd.Timestamp(d))
    except Exception as e:
        print(f"warn: FOMC page fetch failed ({e}); using embedded schedule", file=sys.stderr)
    return dates

# ---------------- Data ----------------
def cboe_series(cboe_file: str, fred_id: str, name: str) -> pd.DataFrame:
    """Daily closes for a CBOE volatility index. Primary source is CBOE
    itself (the publishing exchange); FRED is the fallback. Values are
    identical where both exist (verified 2026-10-13: VIX close 15.21
    and VIX3M 17.93 on 2026-10-12 from both sources). FRED's graph
    endpoint intermittently stalls from this network, hence the order."""
    try:
        raw = fetch(f"https://cdn.cboe.com/api/global/us_indices/daily_prices/{cboe_file}").decode()
        rows = []
        for line in raw.strip().splitlines()[1:]:
            parts = line.split(",")
            if len(parts) >= 5:
                rows.append((parts[0], float(parts[4])))
        if len(rows) < 1000:
            raise RuntimeError(f"CBOE parse yielded only {len(rows)} rows")
        f = pd.DataFrame(rows, columns=["date", name])
        f["date"] = pd.to_datetime(f["date"], format="%m/%d/%Y")
        return f
    except Exception as e:
        print(f"warn: CBOE fetch failed for {name} ({e}); trying FRED", file=sys.stderr)
    csv = fetch(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={fred_id}").decode()
    rows = []
    for line in csv.strip().splitlines()[1:]:
        d, v = line.split(",")
        if v not in (".", ""):
            rows.append((d, float(v)))
    f = pd.DataFrame(rows, columns=["date", name])
    f["date"] = pd.to_datetime(f["date"])
    return f

def load_frame(fomc: set) -> pd.DataFrame:
    raw = json.loads(fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/SPY"
        "?period1=1199145600&period2=1999999999&interval=1d&events=div,split"))
    res = raw["chart"]["result"][0]
    ts = pd.to_datetime(res["timestamp"], unit="s", utc=True).tz_convert("America/New_York")
    df = pd.DataFrame({"date": ts.normalize().tz_localize(None),
                       "adj": res["indicators"]["adjclose"][0]["adjclose"]}).dropna()
    df = df.drop_duplicates("date").sort_values("date").reset_index(drop=True)
    # Ignore today's bar until the close is complete (16:05 ET).
    now_et = datetime.now(ZoneInfo("America/New_York"))
    last = df["date"].iloc[-1]
    if last.date() == now_et.date() and (now_et.hour, now_et.minute) < (16, 5):
        df = df.iloc[:-1].reset_index(drop=True)
    df["ret"] = df["adj"].pct_change()

    vix_asof = None
    for name, cboe_file, fred_id in [("vix", "VIX_History.csv", "VIXCLS"),
                                     ("vxv", "VIX3M_History.csv", "VXVCLS")]:
        f = cboe_series(cboe_file, fred_id, name)
        df = df.merge(f, on="date", how="left")
        if name == "vix":
            vix_asof = f["date"].max()
    # Carry VIX/VXV forward at most one trading day if FRED lags.
    df[["vix", "vxv"]] = df[["vix", "vxv"]].ffill(limit=1)
    df = df.dropna(subset=["ret", "vix", "vxv"]).reset_index(drop=True)
    df.attrs["vix_asof"] = vix_asof

    r = df["ret"].to_numpy()
    df["abs_ret"] = np.abs(r)
    df["rv5"] = df["ret"].rolling(5).std(ddof=1)
    df["rv20"] = df["ret"].rolling(20).std(ddof=1)
    df["rv60"] = df["ret"].rolling(60).std(ddof=1)
    df["ewma_vol"] = np.sqrt(pd.Series(r ** 2).ewm(alpha=1 - 0.94, adjust=False).mean()).to_numpy()
    df["max_abs_5"] = df["abs_ret"].rolling(5).max()
    df["is_fomc"] = df["date"].isin(fomc).astype(float)
    df["dow"] = df["date"].dt.dayofweek
    df["wild"] = (df["abs_ret"] >= 0.01).astype(float)
    return df

def feature_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Feature row for date t uses data through t-1 (study construction)."""
    src = pd.DataFrame({
        "log_rv5": np.log(df["rv5"]), "log_rv20": np.log(df["rv20"]),
        "log_rv60": np.log(df["rv60"]), "log_ewma": np.log(df["ewma_vol"]),
        "abs_ret_1": df["abs_ret"], "max_abs_5": df["max_abs_5"],
        "log_vix": np.log(df["vix"]), "vix_slope": df["vix"] - df["vxv"],
        "is_fomc": df["is_fomc"],
    }).shift(1)
    out = pd.concat([df[["date", "dow"]], src], axis=1)
    return out

def design(feat: pd.DataFrame) -> np.ndarray:
    X = feat[FEATURES].to_numpy(dtype=float)
    dow = np.zeros((len(feat), 4))  # Tue..Fri, Mon baseline
    for j, d in enumerate([1, 2, 3, 4]):
        dow[:, j] = (feat["dow"].to_numpy() == d).astype(float)
    return np.hstack([X, dow])

def fit_logistic(X, y, l2=1.0, iters=100):
    mu, sd = X.mean(0), X.std(0)
    sd[sd == 0] = 1.0
    Xs = (X - mu) / sd
    Xa = np.hstack([np.ones((len(X), 1)), Xs])
    pen = np.concatenate([[0.0], np.full(X.shape[1], l2)])
    beta = np.zeros(X.shape[1] + 1)
    for _ in range(iters):
        p = 1.0 / (1.0 + np.exp(-np.clip(Xa @ beta, -35, 35)))
        g = Xa.T @ (y - p) - pen * beta
        W = p * (1 - p)
        H = (Xa.T * W) @ Xa + np.diag(pen + 1e-9)
        step = np.linalg.solve(H, g)
        beta = beta + step
        if np.max(np.abs(step)) < 1e-9:
            break
    return beta, mu, sd

def fit_ridge(X, y, l2=1.0):
    mu, sd = X.mean(0), X.std(0)
    sd[sd == 0] = 1.0
    Xs = (X - mu) / sd
    Xa = np.hstack([np.ones((len(X), 1)), Xs])
    pen = np.diag(np.concatenate([[0.0], np.full(X.shape[1], l2)]))
    beta = np.linalg.solve(Xa.T @ Xa + pen, Xa.T @ y)
    return beta, mu, sd

def apply(beta, mu, sd, x_row: np.ndarray, logistic=True) -> float:
    xs = (x_row - mu) / sd
    z = float(beta[0] + xs @ beta[1:])
    if logistic:
        return 1.0 / (1.0 + math.exp(-max(-35.0, min(35.0, z))))
    return z

def label_for(p: float) -> str:
    if p < 0.15:
        return "Quiet day likely"
    if p < 0.30:
        return "A typical day"
    if p < 0.45:
        return "Elevated — a wild day is plausible"
    return "Wild day likely"

def next_weekday(d: pd.Timestamp) -> pd.Timestamp:
    n = d + timedelta(days=1)
    while n.weekday() >= 5:
        n += timedelta(days=1)
    return n

def main() -> int:
    state = json.loads(OUT.read_text()) if OUT.exists() else {
        "history": [], "prediction": None, "model": None}
    fomc = fomc_dates()
    df = load_frame(fomc)
    feat = feature_rows(df)
    data_asof = df["date"].iloc[-1]
    prev_asof = state.get("data_asof")
    if prev_asof == str(data_asof.date()) and state.get("prediction"):
        print(f"already up to date (data through {data_asof.date()})")
        return 0
    if prev_asof and str(data_asof.date()) < prev_asof:
        # Rollback guard (added 2026-10-14, Bryant approved): the price
        # feed returned data OLDER than what is already published — seen
        # 2026-10-13 when Yahoo's SPY adjusted close lagged a day and a
        # run nearly re-issued a prediction for a day already past,
        # overwriting the stored call. Fail loudly, write nothing.
        print(f"ERROR: data regressed — feed ends {data_asof.date()}, "
              f"but published state is already through {prev_asof}. "
              "Refusing to publish.")
        return 2

    # 1) Grade the outstanding prediction: the realized "tomorrow" is the
    #    first trading day after the day it was issued.
    pred = state.get("prediction")
    if pred:
        after = df[df["date"] > pd.Timestamp(pred["issued_after"])]
        if len(after):
            row = after.iloc[0]
            state["history"].append({
                "date": str(row["date"].date()),
                "predicted_for": pred["for_date"],
                "prob": pred["prob"], "persist": pred["baselines"]["persistence"],
                "vix": pred["baselines"]["vix"], "clim": pred["baselines"]["climatology"],
                "expected_abs_pct": pred["expected_abs_pct"],
                "abs_ret_pct": round(abs(float(row["ret"])) * 100, 2),
                "wild": bool(abs(float(row["ret"])) >= 0.01),
            })
            state["prediction"] = None

    # 2) Monthly refit (expanding window from 2010), as studied.
    fit_month = f"{data_asof.year:04d}-{data_asof.month:02d}"
    model = state.get("model")
    if not model or model.get("fit_month") != fit_month:
        fit_rows = feat[(feat["date"] >= "2010-01-01") & (feat["date"] <= data_asof)].dropna()
        X = design(fit_rows)
        y = df.set_index("date").loc[fit_rows["date"], "wild"].to_numpy()
        ya = df.set_index("date").loc[fit_rows["date"], "abs_ret"].to_numpy()
        beta, mu, sd = fit_logistic(X, y)
        rbeta, rmu, rsd = fit_ridge(X, ya)
        model = {"fit_month": fit_month, "fit_through": str(data_asof.date()),
                 "train_rows": int(len(fit_rows)),
                 "beta": beta.tolist(), "mu": mu.tolist(), "sd": sd.tolist(),
                 "rbeta": rbeta.tolist(), "rmu": rmu.tolist(), "rsd": rsd.tolist()}
        state["model"] = model

    # 3) Tomorrow's feature row: market features through today's close,
    #    calendar features (weekday, FOMC) of the target day.
    for_date = next_weekday(data_asof)
    lastrow = df.iloc[-1]
    x = {
        "log_rv5": math.log(lastrow["rv5"]), "log_rv20": math.log(lastrow["rv20"]),
        "log_rv60": math.log(lastrow["rv60"]), "log_ewma": math.log(lastrow["ewma_vol"]),
        "abs_ret_1": float(lastrow["abs_ret"]), "max_abs_5": float(lastrow["max_abs_5"]),
        "log_vix": math.log(lastrow["vix"]), "vix_slope": float(lastrow["vix"] - lastrow["vxv"]),
        "is_fomc": 1.0 if for_date in fomc else 0.0,
    }
    feat_row = pd.DataFrame([{**x, "dow": for_date.weekday()}])
    xvec = design(feat_row)[0]
    beta = np.array(model["beta"]); mu = np.array(model["mu"]); sd = np.array(model["sd"])
    prob = apply(beta, mu, sd, xvec, logistic=True)
    rbeta = np.array(model["rbeta"]); rmu = np.array(model["rmu"]); rsd = np.array(model["rsd"])
    exp_abs = max(0.0, apply(rbeta, rmu, rsd, xvec, logistic=False))

    hist_wild = df[df["date"] <= data_asof]["wild"]
    clim = float(hist_wild.mean())
    sig_p = float(lastrow["rv20"])
    sig_v = float(lastrow["vix"]) / 100.0 / math.sqrt(252)
    state["prediction"] = {
        "issued_after": str(data_asof.date()),
        "for_date": str(for_date.date()),
        "prob": round(prob, 4),
        "expected_abs_pct": round(exp_abs * 100, 2),
        "label": label_for(prob),
        "baselines": {
            "persistence": round(2 * (1 - Phi(0.01 / sig_p)), 4),
            "vix": round(2 * (1 - Phi(0.01 / sig_v)), 4),
            "climatology": round(clim, 4),
        },
    }

    # 4) Live stats from graded history.
    h = state["history"]
    if h:
        yv = np.array([1.0 if e["wild"] else 0.0 for e in h])
        stats = {"n": len(h), "wild_days": int(yv.sum())}
        for key, col in [("model", "prob"), ("persistence", "persist"),
                         ("vix", "vix"), ("climatology", "clim")]:
            stats[f"brier_{key}"] = round(float(np.mean(
                (np.array([e[col] for e in h]) - yv) ** 2)), 5)
        stats["skill_vs_persistence"] = round(
            1 - stats["brier_model"] / stats["brier_persistence"], 4)
    else:
        stats = {"n": 0, "wild_days": 0}
    state["live_stats"] = stats
    state["data_asof"] = str(data_asof.date())
    vix_asof = df.attrs.get("vix_asof")
    state["vix_asof"] = str(vix_asof.date()) if vix_asof is not None else None
    state["generated"] = datetime.now(ZoneInfo("America/Los_Angeles")).isoformat()
    state["backtest"] = BACKTEST
    state["model_info"] = {"fit_month": model["fit_month"],
                           "fit_through": model["fit_through"],
                           "train_rows": model["train_rows"]}
    OUT.write_text(json.dumps(state, indent=1))
    p = state["prediction"]
    print(f"graded history: {len(h)} days | prediction for {p['for_date']}: "
          f"P(wild) = {100*p['prob']:.1f}% ({p['label']}), expected |move| {p['expected_abs_pct']}%")
    return 0

if __name__ == "__main__":
    sys.exit(main())
