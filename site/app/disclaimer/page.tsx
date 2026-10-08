import { disclaimerText } from "../lib/market";

const points = [
  {
    title: "Not financial advice",
    body: "Everything on Mockfolio — prices, charts, pick'em scores, and any commentary — is for education and entertainment only. It is not financial advice, not a recommendation to buy or sell any security, and not a solicitation. I am not a financial advisor, and nothing here creates an advisor-client relationship.",
  },
  {
    title: "Paper trading only",
    body: "The pick'em game uses imaginary money. No real trades are placed, no real gains or losses occur, and a good score here does not mean you would make money investing real dollars.",
  },
  {
    title: "Data is delayed and indicative",
    body: "Market data is sourced from Yahoo Finance's free endpoints, is delayed, and may contain errors or gaps. Prices shown are indicative only — always verify with your broker before making any real decision.",
  },
  {
    title: "Past performance doesn't predict anything",
    body: "A stock that went up last week, last year, or for a decade can go down tomorrow. Backtests and track records describe the past, not the future. Around 90% of professional fund managers underperform a plain S&P 500 index fund over 15-year periods (S&P SPIVA scorecards) — keep that in mind before believing anyone's picks, including a website's.",
  },
  {
    title: "Do your own research",
    body: "If you're considering investing real money, do your own research and consider talking to a licensed financial professional who understands your situation. Never invest money you can't afford to lose, and never make decisions based on a personal-project website.",
  },
  {
    title: "No account, no personal data",
    body: "Mockfolio has no accounts and no server. Your pick'em entries are stored only in your own browser's local storage. Nothing is sent anywhere.",
  },
];

export default function Disclaimer() {
  return (
    <div className="max-w-3xl">
      <h1 className="mt-3 font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
        Dis<span className="text-emerald-400 light:text-emerald-600">claimer</span>
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 light:text-zinc-600">
        Plain language, no legalese dodge: {disclaimerText}
      </p>
      <div className="mt-8 space-y-4">
        {points.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-white/10 bg-stone-900/60 p-5 light:border-zinc-200 light:bg-white"
          >
            <h2 className="font-bold">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400 light:text-zinc-600">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
