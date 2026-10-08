import type { Metadata } from "next";
import "./globals.css";
import Header from "./header";
import Footer from "./footer";

export const metadata: Metadata = {
  title: "Mockfolio — track the market, paper-trade for fun",
  description:
    "Mockfolio is a personal project: track market indices and large-cap stocks, and play a weekly paper-trading pick'em game. No real money, not financial advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-950 text-zinc-100 light:bg-zinc-50 light:text-zinc-900">
        <Header />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
