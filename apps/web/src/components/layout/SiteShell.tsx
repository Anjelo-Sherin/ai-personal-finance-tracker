"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wallet, Menu, X, ShieldCheck, LogOut, Settings, Sparkles } from "lucide-react";
import { apiFetch, getStoredToken, setStoredToken, UserProfile } from "@/lib/api";
import { SITE_URL } from "@/lib/formatters";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token && !pathname.startsWith("/app")) return;
    apiFetch<{ user: UserProfile }>("/api/v1/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setStoredToken(null);
    setUser(null);
    router.push("/");
  };

  const handleQuickDemo = async () => {
    setDemoLoading(true);
    try {
      const res = await apiFetch<{ access_token: string; user: UserProfile }>(
        "/api/v1/auth/demo",
        { method: "POST" }
      );
      setStoredToken(res.access_token);
      setUser(res.user);
      router.push("/app");
    } catch {
      router.push("/login");
    } finally {
      setDemoLoading(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/how-it-works", label: "How NLP & Forecast Work" },
    { href: "/case-studies", label: "Benchmarks" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-accentLight/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-primary font-extrabold text-xl tracking-tight focus:outline-none focus:ring-2 focus:ring-primaryDark rounded-lg px-1"
        >
          <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-pinkSm">
            <Wallet className="w-5 h-5" />
          </span>
          <span>PaisaPulse</span>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition py-2 ${
                  active ? "text-primary font-semibold" : "text-ink hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/app"
                className="px-4 py-2.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primaryDark transition shadow-pinkSm"
              >
                Finance Dashboard
              </Link>
              <Link
                href="/app/settings"
                aria-label="Account settings"
                className="p-2.5 rounded-full text-ink hover:bg-soft transition"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Log out"
                className="p-2.5 rounded-full text-muted hover:text-primary hover:bg-soft transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-2 text-sm font-semibold text-ink hover:text-primary transition"
              >
                Log in
              </Link>
              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={demoLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold bg-soft text-primaryDark hover:bg-accentLight/60 transition"
              >
                <Sparkles className="w-4 h-4" />
                {demoLoading ? "Opening..." : "1-Click Demo"}
              </button>
              <Link
                href="/signup"
                className="px-4 py-2.5 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primaryDark transition shadow-pinkSm"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden p-2.5 rounded-xl text-ink hover:bg-soft min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-accentLight px-4 pt-2 pb-5 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-3 rounded-xl text-base font-medium text-ink hover:bg-soft"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-soft flex flex-col gap-2.5">
            {user ? (
              <>
                <Link
                  href="/app"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 rounded-full text-center font-semibold bg-primary text-white"
                >
                  Open Finance Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-full text-center font-medium text-muted border border-accentLight"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleQuickDemo();
                  }}
                  className="w-full py-3 rounded-full text-center font-semibold bg-soft text-primaryDark"
                >
                  Try 1-Click Instant Demo
                </button>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 rounded-full text-center font-semibold bg-primary text-white"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 rounded-full text-center font-medium text-ink"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-accentLight/60 mt-16 pb-20 md:pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-primary font-extrabold text-lg">
              <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </span>
              <span>PaisaPulse</span>
            </div>
            <p className="text-sm text-muted max-w-md leading-relaxed">
              Day 02 of 30 Projects in 30 Days: AI Personal Finance Tracker with Smart
              Categorization. Paste noisy Indian UPI/SMS bank alerts or CSV statements to get
              explainable TF-IDF categorization, active learning retraining, subscription &amp;
              anomaly detection, and a Prophet-style monthly forecast.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primaryDark bg-soft px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>Row-Level User Isolation · Human-in-the-Loop Active Learning</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-ink mb-3">Product &amp; Architecture</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition">
                  How NLP &amp; Forecasting Work
                </Link>
              </li>
              <li>
                <Link href="/case-studies" className="hover:text-primary transition">
                  Model Benchmarks &amp; Examples
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary transition">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-primary transition">
                  Interactive Finance Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-ink mb-3">Trust &amp; Legal</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/privacy" className="hover:text-primary transition">
                  Privacy &amp; RLS Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary transition">
                  Contact &amp; Feedback
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-soft text-xs text-muted flex flex-col sm:flex-row justify-between gap-4">
          <p>
            <strong>Responsible AI Disclaimer:</strong> PaisaPulse is an educational personal
            budgeting and spend analytics tool. Forecasts and savings tips are statistical
            estimates—not licensed financial, investment, or tax advice.
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} PaisaPulse. MIT Licensed.</p>
        </div>
      </div>
    </footer>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      ...items.map((item, idx) => ({
        "@type": "ListItem",
        position: idx + 2,
        name: item.label,
        ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
      })),
    ],
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
        <li>
          <Link href="/" className="hover:text-primary transition">
            Home
          </Link>
        </li>
        {items.map((it, idx) => (
          <React.Fragment key={idx}>
            <li aria-hidden="true" className="text-accent">
              /
            </li>
            <li>
              {it.href ? (
                <Link href={it.href} className="hover:text-primary transition">
                  {it.label}
                </Link>
              ) : (
                <span className="text-ink font-semibold" aria-current="page">
                  {it.label}
                </span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}

export function StickyMobileCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/app")) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-accentLight px-4 py-2.5 shadow-pink">
      <Link
        href="/app"
        className="w-full h-12 rounded-full bg-primary text-white font-semibold text-sm flex items-center justify-center shadow-pinkSm"
      >
        Open AI Finance Dashboard
      </Link>
    </div>
  );
}
