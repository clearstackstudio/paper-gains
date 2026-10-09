"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Markets" },
  { href: "/stocks", label: "Stocks" },
  { href: "/pick-em", label: "Pick'em" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-stone-950/90 backdrop-blur light:border-zinc-200 light:bg-white/90">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 17l5-6 4 3 6-8" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 6h-4M18 6v4" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-base font-extrabold tracking-tight">
            Mock<span className="text-emerald-400 light:text-emerald-600">folio</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium" aria-label="Primary">
          {links.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-lg px-2.5 py-1.5 transition ${
                  active
                    ? "font-semibold text-zinc-100 light:text-zinc-900"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100 light:text-zinc-600 light:hover:bg-zinc-100 light:hover:text-zinc-900"
                }`}
              >
                {l.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full bg-emerald-400 light:bg-emerald-600"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
