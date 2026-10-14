"""Build the historical CPI release-date calendar (2016-2026) from BLS.

Primary source: BLS "Schedule of Releases for the Consumer Price Index"
(www.bls.gov/schedule/news_release/cpi.htm). bls.gov blocks this network
(HTTP 403), so the page is read through Wayback Machine snapshots of
that exact BLS page. Each snapshot lists reference-month -> release-date
rows for ~13 months around the snapshot date (trailing + forward).

Merge rule: snapshots are applied in timestamp order and LATER snapshots
overwrite earlier ones for the same reference month. BLS updates the
page when a release slips (e.g. the late-2025 shutdown), and a snapshot
taken after a release lists the date it actually happened, so the final
map is the actual release date, not the originally scheduled one.

Output: data/cpi_release_dates.csv (reference_month, release_date,
last_seen_snapshot) plus a distinct release-date list in the run log.
"""
import csv
import re
import subprocess
import sys
import time
import urllib.request
from datetime import date

CDX = ("http://web.archive.org/cdx/search/cdx?url=bls.gov/schedule/"
       "news_release/cpi.htm&from=2016&to=2027&output=text"
       "&fl=timestamp,statuscode&filter=statuscode:200")
PAGE = "https://www.bls.gov/schedule/news_release/cpi.htm"
MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}
FULL = {m: i + 1 for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"])}
ROW = re.compile(
    r"(January|February|March|April|May|June|July|August|September|"
    r"October|November|December)\s+(\d{4})\s*(?:\|\s*)+"
    r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s*(\d{1,2}),\s*(\d{4})")


def get(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", errors="ignore")


def main() -> int:
    cdx = subprocess.run(["curl", "-s", CDX], capture_output=True,
                         text=True, check=True).stdout
    snaps = [line.split()[0] for line in cdx.splitlines() if line.strip()]
    # Sample: first snapshot of each (year, month) + the very last one.
    chosen, seen = [], set()
    for ts in snaps:
        if ts[:6] not in seen:
            seen.add(ts[:6])
            chosen.append(ts)
    if snaps[-1] not in chosen:
        chosen.append(snaps[-1])
    print(f"{len(snaps)} snapshots total, fetching {len(chosen)}")

    table = {}  # (ref_year, ref_month) -> (release_date, snapshot_ts)
    for i, ts in enumerate(chosen):
        try:
            html = get(f"https://web.archive.org/web/{ts}id_/{PAGE}")
        except Exception as e:  # noqa: BLE001
            print(f"  {ts}: FETCH FAILED {e}")
            continue
        text = re.sub(r"<[^>]+>", "|", html)
        text = re.sub(r"\s+", " ", text)
        rows = 0
        for m in ROW.finditer(text):
            ref = (int(m.group(2)), FULL[m.group(1)])
            rel = date(int(m.group(5)), MONTHS[m.group(3)], int(m.group(4)))
            table[ref] = (rel, ts)
            rows += 1
        print(f"  {ts}: {rows} rows")
        time.sleep(0.3)

    if len(table) < 100:
        print(f"ABORT: only {len(table)} reference months parsed; "
              "not overwriting output")
        return 1
    out = "data/cpi_release_dates.csv"
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["reference_month", "release_date", "last_seen_snapshot"])
        for (ry, rm) in sorted(table):
            rel, ts = table[(ry, rm)]
            w.writerow([f"{ry:04d}-{rm:02d}", rel.isoformat(), ts])
    dates = sorted({rel for rel, _ in table.values()})
    print(f"\n{len(table)} reference months, {len(dates)} distinct "
          f"release dates -> {out}")
    by_year = {}
    for d in dates:
        by_year[d.year] = by_year.get(d.year, 0) + 1
    print("release dates per calendar year:", dict(sorted(by_year.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
