import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/SiteShell";
import { QuickDemoTrigger } from "@/components/ui/QuickDemoTrigger";

export const metadata: Metadata = {
  title: "How the NLP & Forecasting Architecture Works",
  description: "Deep dive into PaisaPulse's 6-stage NLP parsing, TF-IDF + Logistic Regression categorization, active learning retraining, and Prophet-style forecasting pipeline.",
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Breadcrumbs items={[{ label: "How It Works" }]} />

      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-primaryDark bg-soft px-3 py-1 rounded-full">
          Architecture Specification
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">
          How PaisaPulse Categorizes Noisy Indian UPI Alerts &amp; Forecasts Spend
        </h1>
        <p className="text-base text-muted leading-relaxed">
          Standard personal finance apps rely on rigid keyword lookups or manual user categorization.
          PaisaPulse was engineered specifically for the noisy, unstructured nature of Indian banking SMS
          and UPI payment strings.
        </p>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-card border-2 border-accentLight p-6 shadow-pinkSm space-y-3">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-extrabold">1</span>
            <span>Regex Parsing &amp; Token Normalization</span>
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Raw SMS alerts arrive in unpredictable formats across banks (HDFC, SBI, ICICI, Axis) with random
            order IDs, VPA handles, card masks, and UTR reference codes:
          </p>
          <div className="p-3.5 rounded-xl bg-blush font-mono text-xs text-ink space-y-1">
            <p className="text-muted">// Raw bank SMS:</p>
            <p>&quot;Rs. 485.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421.&quot;</p>
            <p className="text-primary font-bold pt-1">// Extracted &amp; normalized:</p>
            <p>amount: 485.00 INR | date: 2026-10-19 | channel: UPI | normalized_merchant: &quot;SWIGGY&quot;</p>
          </div>
        </section>

        <section className="bg-white rounded-card border-2 border-accentLight p-6 shadow-pinkSm space-y-3">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-extrabold">2</span>
            <span>Hybrid TF-IDF + Logistic Regression NLP Classifier</span>
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Bank narrations often truncate brand names (e.g. <code>SWGGY*ORD</code> or <code>BESCOM*BLR</code>).
            PaisaPulse combines:
          </p>
          <ul className="list-disc list-inside text-sm text-muted space-y-1.5 pl-2">
            <li><strong>Word N-Grams (1–2g):</strong> Captures full words and frequent phrases like <em>&quot;electricity bill&quot;</em> or <em>&quot;movie tickets&quot;</em>.</li>
            <li><strong>Character Subword N-Grams (3–5g):</strong> Handles typos, concatenations, and shortened brand tokens (e.g. <code>swi</code>, <code>wig</code>, <code>netf</code>, <code>zom</code>).</li>
            <li><strong>Balanced Logistic Regression:</strong> Fast, convex optimization that runs in &lt;1 ms on CPU and supports calibrated probability outputs.</li>
          </ul>
        </section>

        <section className="bg-white rounded-card border-2 border-accentLight p-6 shadow-pinkSm space-y-3">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-extrabold">3</span>
            <span>Human-in-the-Loop Active Learning</span>
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            When you correct a category in the dashboard, PaisaPulse saves the correction to your user profile,
            up-weights the correction sample (6× weight), and executes a warm retrain of the scikit-learn pipeline
            in under <strong>25 milliseconds</strong>. Future transactions from that merchant are recognized with 99% confidence.
          </p>
        </section>

        <section className="bg-white rounded-card border-2 border-accentLight p-6 shadow-pinkSm space-y-3">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-extrabold">4</span>
            <span>Prophet-Style Additive Seasonal Forecaster</span>
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Financial spend is non-stationary and exhibits distinct monthly cycles. PaisaPulse decomposes:
          </p>
          <div className="p-3.5 rounded-xl bg-blush font-mono text-xs text-ink">
            y(t) = Trend(t) + S_payday(t) + S_festival(t) + ε
          </div>
          <p className="text-sm text-muted leading-relaxed">
            It accounts for the <strong>days 1–7 month-start salary/rent/utility surge</strong> and festival seasonality
            (e.g. Diwali/year-end spikes) to compute robust 80% prediction intervals.
          </p>
        </section>
      </div>

      <div className="pt-4 text-center">
        <QuickDemoTrigger label="Try It in the Live Dashboard" />
      </div>
    </div>
  );
}
