import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";

import { WalletConnectionPanel } from "@/components/wallet-connection-panel";
import { WalletProvider } from "@/components/wallet-provider";

import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Amazones",
  description: "Agent-first prediction market on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <WalletProvider>
          <div className="app-shell">
            <header className="site-header">
              <div className="shell-content site-header-inner">
                <Link className="brand-mark" href="/">
                  Amazones
                </Link>

                <nav className="top-nav" aria-label="Primary">
                  <Link href="/markets">Markets</Link>
                  <Link href="/portfolio">Portfolio</Link>
                  <Link href="/agents">Agents</Link>
                </nav>

                <WalletConnectionPanel />
              </div>
            </header>

            <main>{children}</main>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
