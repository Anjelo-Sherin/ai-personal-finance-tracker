import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/SiteShell";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Common questions about PaisaPulse's smart categorization, active learning, privacy, and forecasting.",
};

export default function FaqPage() {
  const faqs = [
    {
      q: "How does PaisaPulse categorize Indian UPI and bank SMS alerts?",
      a: "PaisaPulse uses regular expressions to extract the numeric amount, date, payment channel, and merchant text. Then, a hybrid character and word n-gram TF-IDF pipeline with Logistic Regression classifies the merchant into one of 10 categories.",
    },
    {
      q: "What happens when I correct a wrongly categorized merchant?",
      a: "This triggers Active Learning! The app saves your correction in your user account, up-weights the correction sample by 6×, and immediately retrains the scikit-learn model in under 25 ms. Similar transactions are automatically re-classified.",
    },
    {
      q: "Does PaisaPulse require my bank login or netbanking credentials?",
      a: "Never. PaisaPulse operates solely on the text of alerts you paste or the CSV statement you upload. We never ask for bank account numbers, passwords, OTPs, or debit card PINs.",
    },
    {
      q: "How does the monthly spend forecaster handle irregular festival spending?",
      a: "The forecaster uses an additive trend and seasonal decomposition model. It isolates the days 1–7 payday surge and incorporates festival multipliers for major shopping and celebration months like October, November, and December.",
    },
    {
      q: "Can I receive budget alerts on Telegram?",
      a: "Yes! You can configure your Telegram Chat ID in Account Settings and use our pre-built Telegram Bot integration to receive automated budget breach and anomaly digests.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Breadcrumbs items={[{ label: "FAQ" }]} />

      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-primaryDark bg-soft px-3 py-1 rounded-full">
          FAQ
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">
          Frequently Asked Questions
        </h1>
        <p className="text-base text-muted leading-relaxed">
          Everything you need to know about the AI Personal Finance Tracker and its NLP model.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-2">
            <h2 className="text-base font-bold text-ink">{faq.q}</h2>
            <p className="text-sm text-muted leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
