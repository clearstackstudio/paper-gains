# Mockfolio

A personal-project market tracker + paper-trading pick'em game. "Honest Line for
stocks" in tone: honest, educational framing — **not financial advice, paper trading
only, no real money.**

## What it is

- **Market overview** (`/`) — three index cards (S&P 500, Nasdaq, Dow) with 1-year
  sparklines, plus biggest daily movers from the 30-stock universe.
- **Stocks** (`/stocks`) — searchable, sortable table of the 30-stock universe with
  sparklines; click through to a detail page (`/stocks/[symbol]`) with a 1-year
  price chart, 52-week high/low, and an honest "past performance doesn't predict
  anything" note.
- **Pick'em** (`/pick-em`) — each ISO week (Mon–Sun), pick 5 stocks you think will
  gain the most. Picks are stored in your browser (`localStorage`, key
  `pg-pickem-v1`) — no account, no server. When the week closes, your average
  Friday-to-Friday gain is scored against the S&P 500 for the same week, with a
  season scoreboard of total outperformance.
- **Disclaimer** (`/disclaimer`) — plain-language: not financial advice, not an
  advisor, data delayed/indicative, past performance doesn't indicate future results.

## Data pipeline

`bin/fetch_prices.py` fetches 1 year of daily closes from Yahoo Finance (free, no
API key) for the 3 indices and the 30-stock universe, and writes:

- `site/data/market.json` — `{ generated, disclaimer, indices: [...] }`
- `site/data/universe.json` — `{ generated, disclaimer, stocks: [...] }`

Each instrument: `{ symbol, name, price, change, changePct, history: [{ date: "YYYY-MM-DD", close }] }`,
history sorted ascending, ~251 trading days.

Run daily after market close (idempotent). The site imports these JSON files
directly at build time — no API routes, no runtime data fetching.

## Tech

Next.js 14 App Router + TypeScript + Tailwind CSS. Charts are hand-rolled SVG
(no chart library). Dark mode is automatic and OS-driven: default styles are the
dark theme (`stone-950` page / `stone-900` surfaces), with a custom `light:`
Tailwind variant applying under `prefers-color-scheme: light`. No toggle.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # must pass with zero errors
```
