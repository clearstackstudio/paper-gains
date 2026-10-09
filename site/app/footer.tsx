import Link from "next/link";

const links = [
  { href: "/", label: "Markets" },
  { href: "/stocks", label: "Stocks" },
  { href: "/pick-em", label: "Pick'em" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 light:border-zinc-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold" aria-label="Footer">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-zinc-400 transition hover:text-emerald-400 light:text-zinc-600 light:hover:text-emerald-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-500 light:text-zinc-600">
          Mockfolio is a personal project for education and entertainment. Nothing here is
          financial advice, and paper trading involves no real money. Market data is delayed
          and indicative, sourced from Yahoo Finance. Past performance does not indicate
          future results.
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <Link href="/disclaimer" className="font-semibold text-emerald-400 hover:text-emerald-300 light:text-emerald-700 light:hover:text-emerald-600">
            Full disclaimer
          </Link>
          <span className="text-zinc-600 light:text-zinc-400">·</span>
          <span className="text-zinc-600 light:text-zinc-400">Built as a personal project</span>
        </div>
      </div>
    </footer>
  );
}
