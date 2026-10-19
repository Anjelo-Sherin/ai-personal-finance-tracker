import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter, StickyMobileCta } from "@/components/layout/SiteShell";
import { SITE_URL } from "@/lib/formatters";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PaisaPulse — AI Personal Finance Tracker with Smart Categorization",
    template: "%s | PaisaPulse",
  },
  description:
    "Paste a bank SMS or CSV, get categorized spending, recurring subscription detection, anomaly flags, and a Prophet-style monthly forecast with active learning.",
  openGraph: {
    title: "PaisaPulse — AI Personal Finance Tracker with Smart Categorization",
    description:
      "Auto-categorizes noisy Indian UPI/SMS merchant strings using TF-IDF + Logistic Regression, learns from user corrections, flags anomalies, and forecasts next-month spend.",
    url: SITE_URL,
    siteName: "PaisaPulse",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased selection:bg-primary selection:text-white">
        <SiteHeader />
        <main className="flex-grow">{children}</main>
        <SiteFooter />
        <StickyMobileCta />
      </body>
    </html>
  );
}
