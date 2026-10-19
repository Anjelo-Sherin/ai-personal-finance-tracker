import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  BrainCircuit,
  Repeat,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { SITE_URL } from "@/lib/formatters";
import { QuickDemoTrigger, LiveSmsSandbox } from "@/components/ui/QuickDemoTrigger";

export const metadata: Metadata = {
  title: "Paste a Bank SMS or CSV, Get Categorized Spending & a Monthly Forecast",
  description:
    "Day 02 of 30 Projects in 30 Days: AI Personal Finance Tracker with Smart Categorization, Human-in-the-Loop Active Learning, Subscription & Anomaly Detection, and Monthly Forecasting.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PaisaPulse",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web Browser",
    url: SITE_URL,
    description:
      "AI personal finance tracker that parses noisy Indian UPI/SMS bank alerts and CSV statements, classifies merchants with TF-IDF + Logistic Regression, learns from user corrections, flags anomalies, and forecasts next-month spend.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
  };

  const workflowSteps = [
    {
      num: "01",
      title: "Upload CSV / SMS",
      desc: "Paste raw bank SMS / UPI alerts or upload a bank statement CSV file.",
    },
    {
      num: "02",
      title: "Regex Parser",
      desc: "Extracts INR amount, date, channel & strips UTR/order noise from merchant strings.",
    },
    {
      num: "03",
      title: "TF-IDF + LR Classifier",
      desc: "Hybrid word (1–2g) + char (3–5g) TF-IDF + Logistic Regression predicts category.",
    },
    {
      num: "04",
      title: "Rules Engine",
      desc: "Interval matching detects recurring subscriptions; robust z-scores flag spend spikes.",
    },
    {
      num: "05",
      title: "Prophet-Style Forecaster",
      desc: "Models trend + payday & festival seasonality for next-month 80% CI spend forecasts.",
    },
    {
      num: "06",
      title: "Dashboard & Alerts",
      desc: "Interactive charts, active learning corrections, PDF/CSV export & Telegram alerts.",
    },
  ];

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-soft border border-accentLight text-primaryDark text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Day 02 · Full Stack + NLP + Time-Series Forecasting</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight leading-[1.15]">
              Paste a bank SMS or CSV,{" "}
              <span className="text-primary">
                get categorized spending &amp; a monthly forecast.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-xl leading-relaxed">
              Most expense trackers force manual entry.{" "}
              <strong className="text-ink font-semibold">PaisaPulse</strong> reads noisy
              Indian UPI &amp; card strings like{" "}
              <code className="px-1.5 py-0.5 rounded bg-white border border-accentLight text-primaryDark font-mono text-sm">
                SWIGGY*ORDER 8812
              </code>
              , assigns categories with explainable TF-IDF cues,{" "}
              <strong className="text-ink font-semibold">
                learns from your 1-click corrections
              </strong>
              , flags unusual spend anomalies, and predicts next month&apos;s bill.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <QuickDemoTrigger />
              <Link
                href="/signup"
                className="px-6 py-3.5 rounded-full bg-white border-2 border-primary text-primary font-bold text-sm hover:bg-soft transition"
              >
                Create Free Account
              </Link>
              <Link
                href="/how-it-works"
                className="px-3 py-3 text-sm font-semibold text-ink hover:text-primary inline-flex items-center gap-1.5 transition"
              >
                <span>Architecture &amp; ML Pipeline</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-white/90 rounded-xl p-3 border border-accentLight/60">
                <p className="text-xl font-extrabold text-primary">98.4%</p>
                <p className="text-[11px] font-medium text-muted">5-Fold CV Accuracy</p>
              </div>
              <div className="bg-white/90 rounded-xl p-3 border border-accentLight/60">
                <p className="text-xl font-extrabold text-primary">&lt; 25 ms</p>
                <p className="text-[11px] font-medium text-muted">Live Active Retrain</p>
              </div>
              <div className="bg-white/90 rounded-xl p-3 border border-accentLight/60">
                <p className="text-xl font-extrabold text-primary">10 Classes</p>
                <p className="text-[11px] font-medium text-muted">Indian UPI/POS Corpus</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive SMS/UPI Sandbox */}
          <div className="lg:col-span-6">
            <LiveSmsSandbox />
          </div>
        </div>
      </section>

      {/* 6-Step Workflow Diagram Section (Matching Day 02 PDF Page 5) */}
      <section className="bg-white border-y border-accentLight/60 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-primaryDark bg-soft px-3 py-1 rounded-full">
              End-to-End Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-3">
              How PaisaPulse Turns Raw Alerts Into Actionable Forecasts
            </h2>
            <p className="text-sm text-muted mt-2">
              Every transaction passes through our 6-stage NLP, rules, and seasonal forecasting
              pipeline in milliseconds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {workflowSteps.map((step) => (
              <div
                key={step.num}
                className="bg-blush/50 rounded-card border-2 border-accentLight p-5 relative hover:shadow-pinkSm transition"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="w-8 h-8 rounded-full bg-primary text-white font-extrabold text-xs flex items-center justify-center shadow-pinkSm">
                    {step.num}
                  </span>
                  <h3 className="text-base font-extrabold text-ink">{step.title}</h3>
                </div>
                <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes It Stand Out */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-3">
            <span className="w-10 h-10 rounded-xl bg-soft text-primary flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-ink">
              Noisy Indian UPI NLP + Active Learning
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Combines word n-grams and character subword n-grams (`3–5` chars) to classify
              truncated strings. Correct any category in 1 click to retrain the model live.
            </p>
          </div>

          <div className="bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-3">
            <span className="w-10 h-10 rounded-xl bg-soft text-primary flex items-center justify-center">
              <Repeat className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-ink">
              Recurring Subscription Radar
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Detects monthly (`25–35` day) and weekly (`6–8` day) recurring charges across
              Netflix, Spotify, ChatGPT, BESCOM, and rent—and flags stealth price hikes.
            </p>
          </div>

          <div className="bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-3">
            <span className="w-10 h-10 rounded-xl bg-soft text-primary flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-ink">
              Explainable Spend Anomaly Flags
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Computes per-category robust z-scores and median multipliers to flag unusually
              large purchases with plain-English explanations (`3.2x your typical spend`).
            </p>
          </div>

          <div className="bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-3">
            <span className="w-10 h-10 rounded-xl bg-soft text-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-ink">
              Prophet-Style Monthly Forecast
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Captures month-start salary spikes (`days 1–7`) and festival seasonality to
              project next-month category spend with 80% confidence bands and savings tips.
            </p>
          </div>
        </div>

        {/* Bottom CTA Card */}
        <div className="mt-12 bg-white rounded-card border-2 border-primary p-8 shadow-pink text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primaryDark bg-soft px-3.5 py-1 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            <span>Pre-Seeded With 3 Months of Indian UPI, Card &amp; Bill Transactions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
            Ready to test the full AI Finance Dashboard?
          </h2>
          <p className="text-sm text-muted max-w-xl mx-auto">
            Click below to sign in to the pre-seeded demo portfolio, paste SMS alerts, upload a
            CSV, correct a merchant category to watch the model retrain, and export a PDF report.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <QuickDemoTrigger label="Open Interactive Demo Dashboard" />
            <Link
              href="/case-studies"
              className="px-6 py-3.5 rounded-full bg-soft text-primaryDark font-bold text-sm hover:bg-accentLight/60 transition inline-flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>View Model Benchmarks</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
