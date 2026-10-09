"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Markets" },
  { href: "/stocks", label: "Stocks" },
  { href: "/pick-em", label: "Pick'em" },
  { href: "/disclaimer", label: "Disclaimer" },
];

function isActiveLink(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function linkClasses(active: boolean): string {
  return `relative rounded-lg px-2.5 py-1.5 transition ${
    active
      ? "font-semibold text-zinc-100 light:text-zinc-900"
      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100 light:text-zinc-600 light:hover:bg-zinc-100 light:hover:text-zinc-900"
  }`;
}

function ActiveBar() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full bg-emerald-400 light:bg-emerald-600"
    />
  );
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-stone-950/90 backdrop-blur light:border-zinc-200 light:bg-white/90">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 17l5-6 4 3 6-8" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 6h-4M18 6v4" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-base font-extrabold tracking-tight">
            Mock<span className="text-emerald-400 light:text-emerald-600">folio</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex" aria-label="Primary">
          {links.map((l) => {
            const active = isActiveLink(l.href, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={linkClasses(active)}
              >
                {l.label}
                {active && <ActiveBar />}
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="rounded-lg p-2 text-zinc-300 hover:bg-white/5 light:text-zinc-700 light:hover:bg-zinc-100 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav
          className="border-t border-white/10 px-4 pb-3 pt-2 light:border-zinc-200 md:hidden"
          aria-label="Mobile"
        >
          {links.map((l) => {
            const active = isActiveLink(l.href, pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`relative block rounded-lg px-2.5 py-2.5 text-[15px] ${linkClasses(active)}`}
              >
                {l.label}
                {active && <ActiveBar />}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
