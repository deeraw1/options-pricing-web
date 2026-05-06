import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Options Pricing Lab — Black-Scholes, Heston, Greeks, Vol Surface",
  description:
    "Closed-form Black-Scholes, Heston stochastic volatility pricing, full Greeks, implied volatility solver and vol-surface arbitrage diagnostics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
