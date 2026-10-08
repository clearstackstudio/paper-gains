import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 light:border-zinc-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-zinc-500 light:text-zinc-600 sm:px-6">
        <p className="max-w-3xl leading-relaxed">
          Mockfolio is a personal project for education and entertainment. Nothing here is
          financial advice, and paper trading involves no real money. Market data is delayed
          and indicative, sourced from Yahoo Finance. Past performance does not indicate
          future results.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <Link href="/disclaimer" className="font-semibold text-emerald-400 hover:text-emerald-300 light:text-emerald-700 light:hover:text-emerald-600">
            Full disclaimer
          </Link>
          <span className="text-zinc-600 light:text-zinc-400">·</span>
          <span>Built as a personal project</span>
        </div>
      </div>
    </footer>
  );
}
