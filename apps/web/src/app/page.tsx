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

      {/* Bento Grid Showcase Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="bento-pill bg-soft text-primaryDark text-xs font-bold border border-accentLight/60">
            Bento Grid Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink mt-3 tracking-tight">
            Engineered for Real-World Indian Banking Data
          </h2>
          <p className="text-sm text-muted mt-2">
            Explore the 5 modular intelligence engines powering PaisaPulse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {/* Bento Box 1: Large NLP & Active Learning (7 cols) */}
          <div className="lg:col-span-7 bento-card-gradient p-7 flex flex-col justify-between relative overflow-hidden group">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-soft text-primary flex items-center justify-center shadow-pinkSm">
                  <BrainCircuit className="w-5 h-5" />
                </span>
                <span className="bento-pill bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                  5-Fold CV: 98.4%
                </span>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-ink">
                  Hybrid Word + Subword Char TF-IDF with Live Active Retraining
                </h3>
                <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                  Indian bank SMS strings are messy: <code className="text-primaryDark bg-white px-1.5 py-0.5 rounded border border-bentoBorder font-mono text-xs">SWIGGY*ORDER 8812</code>, <code className="text-primaryDark bg-white px-1.5 py-0.5 rounded border border-bentoBorder font-mono text-xs">ACH D- BESCOM BLR</code>. 
                  Our classifier combines word n-grams (1–2g) and character subword n-grams (3–5g) to achieve sub-2ms CPU inference and learns from human corrections in &lt; 25 ms.
                </p>
              </div>

              {/* Visual Subword Token Demonstration */}
              <div className="p-3.5 rounded-2xl bg-white/80 border border-bentoBorder space-y-2">
                <span className="text-[10px] font-bold uppercase text-muted tracking-wider block">FeatureUnion Token Decomposition:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-soft text-primaryDark text-[11px] font-mono font-bold">word: &quot;swiggy&quot;</span>
                  <span className="px-2 py-0.5 rounded-lg bg-soft text-primaryDark text-[11px] font-mono font-bold">word: &quot;order&quot;</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blush text-primary text-[11px] font-mono">char: &quot;wig&quot;</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blush text-primary text-[11px] font-mono">char: &quot;igg&quot;</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blush text-primary text-[11px] font-mono">char: &quot;ggy&quot;</span>
                  <span className="ml-auto text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    &rarr; Food &amp; Dining (98% Conf)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-bentoBorder/70 flex items-center justify-between text-xs text-muted">
              <span>Latency: &lt; 1.2 ms per transaction</span>
              <span className="font-bold text-primary">Zero Cloud API Lag</span>
            </div>
          </div>

          {/* Bento Box 2: Prophet Seasonal Forecaster (5 cols) */}
          <div className="lg:col-span-5 bento-card p-7 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </span>
                <span className="bento-pill bg-primary/10 text-primaryDark border border-primary/20 text-xs font-bold">
                  80% Prediction Band
                </span>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-ink">
                  Prophet-Style Additive Forecaster
                </h3>
                <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                  Most finance apps only look backwards. PaisaPulse decomposes trend and Indian month-start salary surges (days 1–7) to predict next month&apos;s bills and safe savings rates.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blush/60 border border-bentoBorder space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink">Payday Salary Spike (Days 1–7):</span>
                  <span className="font-extrabold text-primary">41.3% of spend</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white overflow-hidden border border-bentoBorder">
                  <div className="h-full bg-primary rounded-full" style={{ width: "41.3%" }} />
                </div>
                <p className="text-[11px] text-muted">Models rent, utility mandates &amp; grocery restocks accurately.</p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-bentoBorder/70 flex items-center justify-between text-xs text-muted">
              <span>Confidence: 80% CI Envelope</span>
              <span className="font-bold text-emerald-700">+₹11,550 Potential Savings</span>
            </div>
          </div>

          {/* Bento Box 3: Recurring Subscription Radar (4 cols) */}
          <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <Repeat className="w-4 h-4" />
                </span>
                <span className="bento-pill bg-purple-50 text-purple-900 border border-purple-200 text-xs">
                  12 Mandates
                </span>
              </div>
              <h3 className="text-base font-extrabold text-ink">
                Recurring Subscription &amp; Hike Radar
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Matches 25–35 day monthly &amp; 6–8 day weekly charges across Netflix, Spotify, ChatGPT, BESCOM &amp; rent. Instantly alerts you on stealth price hikes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
              <span className="text-muted">Total Active:</span>
              <span className="font-extrabold text-primary">₹29,926/mo</span>
            </div>
          </div>

          {/* Bento Box 4: Spend Anomaly Radar (4 cols) */}
          <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <span className="bento-pill bg-amber-100 text-amber-900 text-xs font-bold">
                  z &ge; 2.0 Outliers
                </span>
              </div>
              <h3 className="text-base font-extrabold text-ink">
                Explainable Spend Anomaly Radar
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Computes per-category robust z-scores and median multipliers to flag unusually large transactions with plain-English reasons (&quot;3.4x your typical spend&quot;).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
              <span className="text-muted">Detection:</span>
              <span className="font-extrabold text-amber-900">Per-Category Median</span>
            </div>
          </div>

          {/* Bento Box 5: Zero Biometric / Password Footprint (4 cols) */}
          <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <span className="bento-pill bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
                  Zero Credential Risk
                </span>
              </div>
              <h3 className="text-base font-extrabold text-ink">
                Privacy-First Row-Level Security
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Zero net banking passwords, UPI PINs, or card CVVs collected. Parses only transaction narration text with strict Supabase / PostgreSQL Row-Level Security.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
              <span className="text-muted">Database Footprint:</span>
              <span className="font-extrabold text-emerald-700">0 Bytes Sensitive</span>
            </div>
          </div>
        </div>

        {/* Bottom Bento CTA Banner */}
        <div className="mt-12 bento-card-gradient p-8 text-center space-y-4 border-2 border-primary/40 shadow-pink">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primaryDark bg-soft px-3.5 py-1.5 rounded-full border border-accentLight/60">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Pre-Seeded With 3 Months of Indian UPI, Card &amp; Bill Transactions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Ready to experience the Bento Grid Intelligence Dashboard?
          </h2>
          <p className="text-sm text-muted max-w-xl mx-auto leading-relaxed">
            Sign in with 1-click to test the interactive Bento Grid, paste live UPI alerts, upload bank statements, and trigger the active learning retraining loop.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <QuickDemoTrigger label="Launch Bento Dashboard (1-Click Demo)" />
            <Link
              href="/case-studies"
              className="bento-pill px-6 py-3.5 bg-soft hover:bg-accentLight/60 text-primaryDark text-sm font-bold shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>View Latency &amp; Accuracy Benchmarks</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
