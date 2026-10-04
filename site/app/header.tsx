import Link from "next/link";

const links = [
  { href: "/", label: "Markets" },
  { href: "/stocks", label: "Stocks" },
  { href: "/pick-em", label: "Pick'em" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-stone-950/90 backdrop-blur light:border-zinc-200 light:bg-white/90">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 17l5-6 4 3 6-8" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 6h-4M18 6v4" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-base font-extrabold tracking-tight">
            Paper<span className="text-emerald-400 light:text-emerald-600">Gains</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-2.5 py-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100 light:text-zinc-600 light:hover:bg-zinc-100 light:hover:text-zinc-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
