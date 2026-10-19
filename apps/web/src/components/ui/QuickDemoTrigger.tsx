"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Terminal, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { apiFetch, setStoredToken, UserProfile } from "@/lib/api";
import { formatINR } from "@/lib/formatters";

export function QuickDemoTrigger({ label = "Launch Instant Demo Dashboard" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLaunch = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ access_token: string; user: UserProfile }>(
        "/api/v1/auth/demo",
        { method: "POST" }
      );
      setStoredToken(res.access_token);
      router.push("/app");
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLaunch}
      disabled={loading}
      className="px-6 py-3.5 rounded-full bg-primary text-white font-bold text-sm hover:bg-primaryDark transition shadow-pink inline-flex items-center gap-2 disabled:opacity-60"
    >
      <Sparkles className="w-4 h-4" />
      <span>{loading ? "Loading 3-Month Demo..." : label}</span>
      <ArrowRight className="w-4 h-4" />
    </button>
  );
}

interface ParsedItem {
  raw_text: string;
  tx_date: string;
  merchant: string;
  normalized_merchant: string;
  amount: number;
  tx_type: string;
  channel: string;
  category: string;
  confidence: number;
  top_tokens: string[];
}

export function LiveSmsSandbox() {
  const [smsText, setSmsText] = useState(
    "Rs. 485.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421.\nAlert: INR 649.00 spent on HDFC Card XX1234 at POS 4111XXXXXXXX1234 NETFLIX.COM on 18-10-2026.\nYour A/c XX4821 debited for Rs. 1,480.00 towards ACH D- BESCOM ELECTRICITY BILL BLR on 15-10-2026."
  );
  const [results, setResults] = useState<ParsedItem[]>([
    {
      raw_text: "Rs. 485.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421.",
      tx_date: "2026-10-19",
      merchant: "SWIGGY*ORDER 8812",
      normalized_merchant: "SWIGGY",
      amount: 485,
      tx_type: "debit",
      channel: "UPI",
      category: "Food & Dining",
      confidence: 0.96,
      top_tokens: ["swiggy", "subword:swi", "subword:igg"],
    },
    {
      raw_text: "Alert: INR 649.00 spent on HDFC Card XX1234 at POS 4111XXXXXXXX1234 NETFLIX.COM on 18-10-2026.",
      tx_date: "2026-10-18",
      merchant: "NETFLIX.COM",
      normalized_merchant: "NETFLIX.COM",
      amount: 649,
      tx_type: "debit",
      channel: "POS/Card",
      category: "Subscriptions & OTT",
      confidence: 0.97,
      top_tokens: ["netflix", "subword:netf", "com"],
    },
    {
      raw_text: "Your A/c XX4821 debited for Rs. 1,480.00 towards ACH D- BESCOM ELECTRICITY BILL BLR on 15-10-2026.",
      tx_date: "2026-10-15",
      merchant: "ACH D- BESCOM ELECTRICITY BILL",
      normalized_merchant: "BESCOM ELECTRICITY BILL",
      amount: 1480,
      tx_type: "debit",
      channel: "ACH/Auto-Debit",
      category: "Bills & Utilities",
      confidence: 0.98,
      top_tokens: ["bescom", "electricity", "bill"],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ items: ParsedItem[] }>("/api/v1/finance/parse-preview", {
        method: "POST",
        body: JSON.stringify({ text: smsText }),
      });
      setResults(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse SMS");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRandomSample = async () => {
    try {
      const res = await apiFetch<{ text: string }>("/api/v1/finance/sample-sms?count=4");
      setSmsText(res.text);
      const parsed = await apiFetch<{ items: ParsedItem[] }>("/api/v1/finance/parse-preview", {
        method: "POST",
        body: JSON.stringify({ text: res.text }),
      });
      setResults(parsed.items);
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white rounded-card border-2 border-accentLight p-5 sm:p-6 shadow-pink">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-soft text-primary flex items-center justify-center">
            <Terminal className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-ink">
              Live Bank SMS / UPI NLP Parser Sandbox
            </h2>
            <p className="text-xs text-muted">
              Regex extracts amount, date &amp; merchant · TF-IDF + Logistic Regression predicts category
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLoadRandomSample}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primaryDark bg-soft px-3 py-1.5 rounded-full transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Generate Random UPI SMS</span>
        </button>
      </div>

      <label htmlFor="live-sms-input" className="sr-only">
        Paste bank SMS or UPI alert lines
      </label>
      <textarea
        id="live-sms-input"
        rows={3}
        value={smsText}
        onChange={(e) => setSmsText(e.target.value)}
        className="w-full rounded-xl border border-accentLight bg-blush/40 p-3 text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Paste bank SMS or UPI alert text here..."
      />

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted">
          Supports multi-line SMS alerts, UPI IDs, POS card strings &amp; NEFT credits
        </span>
        <button
          type="button"
          onClick={handleParse}
          disabled={loading}
          className="px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primaryDark transition shadow-pinkSm"
        >
          {loading ? "Parsing & Classifying..." : "Parse & Categorize Now"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {results.map((item, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-blush/50 border border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-ink">{item.normalized_merchant}</span>
                <span className="text-[11px] font-medium text-muted">
                  ({item.tx_date} · {item.channel})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white">
                  {item.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {Math.round(item.confidence * 100)}% conf
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                <span>TF-IDF cues:</span>
                {item.top_tokens.slice(0, 3).map((tok, tIdx) => (
                  <code
                    key={tIdx}
                    className="px-1.5 py-0.5 rounded bg-white border border-accentLight/60 text-primaryDark font-mono"
                  >
                    {tok}
                  </code>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-extrabold text-ink">{formatINR(item.amount, true)}</span>
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted">
                {item.tx_type}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
