"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Upload,
  FileText,
  Download,
  BrainCircuit,
  Repeat,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Send,
  Search,
  Trash2,
  Sliders,
} from "lucide-react";
import {
  apiFetch,
  DashboardPayload,
  getStoredToken,
  setStoredToken,
  UserProfile,
} from "@/lib/api";
import { INITIAL_DASHBOARD_DATA } from "@/lib/initialData";
import { API_URL, formatINR } from "@/lib/formatters";
import { CategoryDonutChart, ForecastTimelineChart } from "@/components/charts/Charts";

export default function FinanceDashboardPage() {
  const [data, setData] = useState<DashboardPayload>(INITIAL_DASHBOARD_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "transactions" | "radar" | "budgets"
  >("overview");

  // SMS Ingestion State
  const [smsInput, setSmsInput] = useState("");
  const [ingestingSms, setIngestingSms] = useState(false);

  // Filters for Transactions Table
  const [catFilter, setCatFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyAnomalies, setOnlyAnomalies] = useState(false);
  const [onlyRecurring, setOnlyRecurring] = useState(false);

  // Active Learning Banner
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);

  // Telegram Alert Preview
  const [telegramPreview, setTelegramPreview] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);

  // Budget Editing State
  const [budgetEdits, setBudgetEdits] = useState<Record<string, number>>({});
  const [savingBudgets, setSavingBudgets] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-authenticate into demo account if no token stored so the dashboard always works in 1 click
      if (!getStoredToken()) {
        const demoRes = await apiFetch<{ access_token: string; user: UserProfile }>(
          "/api/v1/auth/demo",
          { method: "POST" }
        );
        setStoredToken(demoRes.access_token);
      }
      const dash = await apiFetch<DashboardPayload>("/api/v1/finance/dashboard");
      setData(dash);
      const initialBudgets: Record<string, number> = {};
      dash.budgets.forEach((b) => {
        initialBudgets[b.category] = b.monthly_limit;
      });
      setBudgetEdits(initialBudgets);
    } catch {
      // Retry once with fresh demo token
      try {
        const demoRes = await apiFetch<{ access_token: string; user: UserProfile }>(
          "/api/v1/auth/demo",
          { method: "POST" }
        );
        setStoredToken(demoRes.access_token);
        const dash = await apiFetch<DashboardPayload>("/api/v1/finance/dashboard");
        setData(dash);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleFillSampleSms = async () => {
    try {
      const res = await apiFetch<{ text: string }>("/api/v1/finance/sample-sms?count=4");
      setSmsInput(res.text);
    } catch {
      // ignore
    }
  };

  const handleIngestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsInput.trim()) return;
    setIngestingSms(true);
    try {
      const res = await apiFetch<{ ingested_count: number }>("/api/v1/finance/ingest-sms", {
        method: "POST",
        body: JSON.stringify({ text: smsInput }),
      });
      setSmsInput("");
      setToastBanner(
        `Parsed, categorized & ran anomaly/subscription rules on ${res.ingested_count} new SMS transaction(s)!`
      );
      await loadDashboard();
    } catch (err: unknown) {
      setToastBanner(err instanceof Error ? err.message : "Failed to parse SMS");
    } finally {
      setIngestingSms(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await apiFetch<{ ingested_count: number; filename: string }>(
        "/api/v1/finance/upload-csv",
        {
          method: "POST",
          body: formData,
        }
      );
      setToastBanner(
        `Imported & auto-categorized ${res.ingested_count} transactions from ${res.filename}!`
      );
      await loadDashboard();
    } catch (err: unknown) {
      setToastBanner(err instanceof Error ? err.message : "CSV upload failed");
    } finally {
      e.target.value = "";
    }
  };

  const handleGenerateSynthetic = async () => {
    setRetraining(true);
    try {
      const res = await apiFetch<{ ingested_count: number }>(
        "/api/v1/finance/generate-synthetic",
        {
          method: "POST",
          body: JSON.stringify({ mode: "append_batch", count: 6 }),
        }
      );
      setToastBanner(
        `Generated & classified ${res.ingested_count} new synthetic Indian UPI/POS transactions!`
      );
      await loadDashboard();
    } finally {
      setRetraining(false);
    }
  };

  const handleCategoryCorrection = async (txId: string, newCategory: string) => {
    setRetraining(true);
    try {
      const res = await apiFetch<{
        updated_similar_count: number;
        model_metrics: { cv_accuracy: number; last_train_ms: number; user_corrections_count: number };
      }>(`/api/v1/finance/transactions/${txId}/category`, {
        method: "PATCH",
        body: JSON.stringify({ category: newCategory, apply_to_similar: true }),
      });
      setToastBanner(
        `Active Learning: Retrained TF-IDF + LR model in ${res.model_metrics.last_train_ms} ms! Updated ${res.updated_similar_count} matching merchant transaction(s) to "${newCategory}" (5-Fold CV Accuracy: ${(res.model_metrics.cv_accuracy * 100).toFixed(1)}%).`
      );
      await loadDashboard();
    } catch (err: unknown) {
      setToastBanner(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setRetraining(false);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    try {
      await apiFetch(`/api/v1/finance/transactions/${txId}`, { method: "DELETE" });
      await loadDashboard();
    } catch {
      // ignore
    }
  };

  const handleSaveBudgets = async () => {
    setSavingBudgets(true);
    try {
      const items = Object.entries(budgetEdits).map(([category, monthly_limit]) => ({
        category,
        monthly_limit: Number(monthly_limit) || 1000,
        alert_threshold_pct: 80.0,
      }));
      const updated = await apiFetch<DashboardPayload>("/api/v1/finance/budgets", {
        method: "PUT",
        body: JSON.stringify({ budgets: items }),
      });
      setData(updated);
      setToastBanner("Updated monthly category budget guardrails!");
    } finally {
      setSavingBudgets(false);
    }
  };

  const handleTelegramAlert = async () => {
    try {
      const res = await apiFetch<{
        delivered: boolean;
        status: string;
        message_preview: string;
      }>("/api/v1/finance/alerts/telegram-test", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setTelegramPreview(res.message_preview);
      setTelegramStatus(res.status);
    } catch {
      // ignore
    }
  };

  const handleDownloadFile = async (endpoint: string, filename: string) => {
    const token = getStoredToken();
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-bold text-ink">
          Loading PaisaPulse NLP Categorizer, Anomaly Engine &amp; Prophet-Style Forecaster...
        </p>
      </div>
    );
  }

  const { summary, forecast, recurring_subscriptions, anomalies, budgets } = data;

  const filteredTransactions = data.recent_transactions.filter((tx) => {
    if (catFilter !== "ALL" && tx.category !== catFilter) return false;
    if (onlyAnomalies && !tx.is_anomaly) return false;
    if (onlyRecurring && !tx.is_recurring) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !tx.merchant.toLowerCase().includes(q) &&
        !tx.normalized_merchant.toLowerCase().includes(q) &&
        !tx.raw_text.toLowerCase().includes(q) &&
        !tx.category.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-7">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-card border-2 border-accentLight p-5 shadow-pinkSm">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primaryDark bg-soft px-3 py-1 rounded-full mb-2">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>
              Active Learning TF-IDF + LR · 5-Fold CV: {summary.cv_accuracy_pct}% · Retrain:{" "}
              {summary.last_train_ms} ms
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
            AI Personal Finance &amp; Forecast Dashboard
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {summary.transaction_count} transactions analysed · {summary.user_corrections_count}{" "}
            human-in-the-loop merchant rules learned
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenerateSynthetic}
            disabled={retraining}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-soft text-primaryDark text-xs font-bold hover:bg-accentLight/60 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+6 Synthetic UPI Txns</span>
          </button>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-accentLight text-ink text-xs font-bold hover:bg-soft transition">
            <Upload className="w-3.5 h-3.5 text-primary" />
            <span>Upload CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() =>
              handleDownloadFile(
                "/api/v1/finance/export.csv",
                "paisapulse_categorized_transactions.csv"
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-accentLight text-ink text-xs font-bold hover:bg-soft transition"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleDownloadFile(
                "/api/v1/finance/report.pdf",
                "paisapulse_monthly_forecast_report.pdf"
              )
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primaryDark transition shadow-pinkSm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Live Toast Feedback Banner */}
      {toastBanner && (
        <div
          role="status"
          className="bg-primary text-white rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between shadow-pinkSm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastBanner(null)}
            className="text-white/80 hover:text-white underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-card border border-accentLight p-5 shadow-pinkSm">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Active Month Spend ({summary.active_month})
          </p>
          <p className="text-2xl font-extrabold text-ink mt-1">
            {formatINR(summary.active_month_debit)}
          </p>
          <p className="text-xs text-muted mt-1">
            3-Month Total: <strong className="text-ink">{formatINR(summary.total_debit)}</strong>
          </p>
        </div>

        <div className="bg-white rounded-card border-2 border-primary/40 p-5 shadow-pinkSm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-primaryDark">
              Next-Month Forecast ({forecast.next_month})
            </p>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-primary mt-1">
            {formatINR(forecast.total_predicted)}
          </p>
          <p className="text-[11px] text-muted mt-1">
            80% CI: {formatINR(forecast.lower_bound)} – {formatINR(forecast.upper_bound)}
          </p>
        </div>

        <div className="bg-white rounded-card border border-accentLight p-5 shadow-pinkSm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Recurring Subscriptions
            </p>
            <Repeat className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-ink mt-1">
            {formatINR(summary.recurring_monthly_total)}
            <span className="text-xs font-semibold text-muted">/mo</span>
          </p>
          <p className="text-xs text-muted mt-1">
            {summary.recurring_count} active monthly/weekly mandates
          </p>
        </div>

        <div className="bg-white rounded-card border border-accentLight p-5 shadow-pinkSm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Spend Anomalies &amp; Savings
            </p>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-ink mt-1">
            {summary.anomaly_count} Flagged
          </p>
          <p className="text-xs text-emerald-700 font-semibold mt-1">
            Save up to {formatINR(forecast.potential_extra_savings)}/mo
          </p>
        </div>
      </div>

      {/* Paste Bank SMS / UPI Alert Ingestion Box */}
      <form
        onSubmit={handleIngestSms}
        className="bg-white rounded-card border border-accentLight p-5 shadow-pinkSm space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-ink">
              Paste Bank SMS or UPI Alert Text (Single or Multi-Line Batch)
            </h2>
            <p className="text-xs text-muted">
              Regex extracts amount, date &amp; merchant · TF-IDF + Logistic Regression classifies
              · Rules engine checks for anomalies
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillSampleSms}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-soft px-3 py-1.5 rounded-full hover:bg-accentLight/60 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Fill Sample Indian UPI SMS</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <textarea
            rows={2}
            value={smsInput}
            onChange={(e) => setSmsInput(e.target.value)}
            placeholder="e.g. Rs. 540.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421"
            className="flex-grow rounded-xl border border-accentLight bg-blush/30 p-3 text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={ingestingSms || !smsInput.trim()}
            className="px-5 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primaryDark transition shrink-0 shadow-pinkSm disabled:opacity-50"
          >
            {ingestingSms ? "Categorizing..." : "Ingest & Categorize SMS"}
          </button>
        </div>
      </form>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-accentLight pb-3">
        {[
          { id: "overview", label: "1. Category Split & Monthly Forecast" },
          {
            id: "transactions",
            label: `2. Transactions & Active Learning (${summary.transaction_count})`,
          },
          {
            id: "radar",
            label: `3. Subscriptions (${summary.recurring_count}) & Anomalies (${summary.anomaly_count})`,
          },
          { id: "budgets", label: "4. Budget Guardrails & Telegram Alerts" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() =>
              setActiveTab(tab.id as "overview" | "transactions" | "radar" | "budgets")
            }
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-pinkSm"
                : "bg-white text-ink border border-accentLight hover:bg-soft"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview & Prophet-Style Forecast */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Split Donut */}
            <div className="lg:col-span-6 bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-ink">
                    Category Spend Split
                  </h2>
                  <p className="text-xs text-muted">
                    Auto-classified by Hybrid Word + Char N-Gram TF-IDF + Logistic Regression
                  </p>
                </div>
              </div>
              <CategoryDonutChart
                items={summary.category_breakdown}
                totalSpend={summary.total_debit}
              />
            </div>

            {/* Prophet-Style Monthly Spend Forecast */}
            <div className="lg:col-span-6 bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-ink">
                    Monthly Spend &amp; Next-Month Forecast ({forecast.next_month})
                  </h2>
                  <p className="text-xs text-muted">
                    Additive Trend + Month-Start Salary Spike ({forecast.payday_spike_share_pct}% in
                    days 1–7) + 80% CI Band
                  </p>
                </div>
              </div>
              <ForecastTimelineChart timeline={forecast.monthly_timeline} />
            </div>
          </div>

          {/* AI Savings Suggestions + Per-Category Forecast Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-card border-2 border-primary/30 p-6 shadow-pinkSm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primaryDark bg-soft px-2.5 py-0.5 rounded-full">
                    AI Savings Advisor
                  </span>
                  <h3 className="text-base font-extrabold text-ink mt-1.5">
                    Actionable Next-Month Savings Plan
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-emerald-700">
                    +{formatINR(forecast.potential_extra_savings)}/mo
                  </span>
                  <p className="text-[10px] text-muted">Potential Savings</p>
                </div>
              </div>

              <div className="space-y-3">
                {forecast.savings_suggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-blush/60 border border-accentLight/70 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-ink">{sug.title}</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Save {formatINR(sug.monthly_saving)}/mo
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{sug.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-card border border-accentLight p-6 shadow-pinkSm">
              <h3 className="text-base font-extrabold text-ink mb-1">
                Per-Category Next-Month Forecast ({forecast.next_month})
              </h3>
              <p className="text-xs text-muted mb-4">
                Forecasted spend per category with 80% prediction intervals
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-soft text-muted">
                      <th className="py-2 font-bold">Category</th>
                      <th className="py-2 font-bold text-right">Last Month</th>
                      <th className="py-2 font-bold text-right">Forecast</th>
                      <th className="py-2 font-bold text-right">80% Confidence Band</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft">
                    {forecast.category_forecasts.map((cf) => (
                      <tr key={cf.category} className="hover:bg-blush/30">
                        <td className="py-2.5 font-bold text-ink">{cf.category}</td>
                        <td className="py-2.5 text-right text-muted">
                          {formatINR(cf.last_month_actual)}
                        </td>
                        <td className="py-2.5 text-right font-extrabold text-primary">
                          {formatINR(cf.predicted)}
                        </td>
                        <td className="py-2.5 text-right text-muted">
                          {formatINR(cf.lower_bound)} – {formatINR(cf.upper_bound)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Transactions & Human-in-the-Loop Active Learning Studio */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-ink">
                Human-in-the-Loop Active Learning Transaction Table
              </h2>
              <p className="text-xs text-muted">
                Change any category dropdown below to immediately retrain the scikit-learn TF-IDF +
                Logistic Regression model and update similar merchants!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search merchant or SMS..."
                  className="pl-8 pr-3 py-1.5 rounded-full border border-accentLight text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <select
                aria-label="Filter by category"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-1.5 rounded-full border border-accentLight text-xs font-semibold text-ink bg-white"
              >
                <option value="ALL">All Categories</option>
                {data.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setOnlyAnomalies(!onlyAnomalies)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  onlyAnomalies
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-ink border-accentLight"
                }`}
              >
                Anomalies Only
              </button>

              <button
                type="button"
                onClick={() => setOnlyRecurring(!onlyRecurring)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  onlyRecurring
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-ink border-accentLight"
                }`}
              >
                Recurring Only
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-soft text-muted">
                  <th className="py-2.5 px-2 font-bold">Date</th>
                  <th className="py-2.5 px-2 font-bold">Merchant &amp; Raw SMS / Narration</th>
                  <th className="py-2.5 px-2 font-bold">TF-IDF Cues &amp; Flags</th>
                  <th className="py-2.5 px-2 font-bold">
                    Category (Click to Correct &amp; Retrain)
                  </th>
                  <th className="py-2.5 px-2 font-bold text-right">Amount</th>
                  <th className="py-2.5 px-2 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-blush/30">
                    <td className="py-3 px-2 whitespace-nowrap font-semibold text-ink">
                      {tx.tx_date}
                      <span className="block text-[10px] text-muted">{tx.channel}</span>
                    </td>
                    <td className="py-3 px-2 max-w-xs">
                      <div className="font-extrabold text-ink">{tx.normalized_merchant}</div>
                      <div className="text-[11px] text-muted truncate" title={tx.raw_text}>
                        {tx.raw_text}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {tx.top_tokens.slice(0, 2).map((tok, idx) => (
                          <code
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-blush border border-accentLight/60 text-[10px] font-mono text-primaryDark"
                          >
                            {tok}
                          </code>
                        ))}
                        {tx.user_corrected && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            User Learned
                          </span>
                        )}
                        {tx.is_recurring && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                            Recurring ({tx.recurring_interval_days}d)
                          </span>
                        )}
                        {tx.is_anomaly && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold"
                            title={tx.anomaly_reason || "Anomalous spend"}
                          >
                            Anomaly: {tx.anomaly_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Category for ${tx.normalized_merchant}`}
                          value={tx.category}
                          onChange={(e) => handleCategoryCorrection(tx.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg border border-accentLight bg-soft/60 text-xs font-bold text-primaryDark focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {data.categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] font-semibold text-muted">
                          {Math.round(tx.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td
                      className={`py-3 px-2 text-right whitespace-nowrap font-extrabold ${
                        tx.tx_type === "credit" ? "text-emerald-700" : "text-ink"
                      }`}
                    >
                      {tx.tx_type === "credit" ? "+" : ""}
                      {formatINR(tx.amount, true)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteTx(tx.id)}
                        aria-label={`Delete transaction ${tx.normalized_merchant}`}
                        className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Recurring Subscriptions & Spend Anomalies Radar */}
      {activeTab === "radar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recurring Subscriptions */}
          <div className="lg:col-span-6 bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  Detected Recurring Subscriptions &amp; Mandates
                </h2>
                <p className="text-xs text-muted">
                  Merchant + interval matching (25–35d monthly, 6–8d weekly)
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-soft text-primaryDark text-xs font-extrabold">
                {formatINR(summary.recurring_monthly_total)}/mo
              </span>
            </div>

            <div className="space-y-3">
              {recurring_subscriptions.map((sub, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-blush/50 border border-accentLight/70 flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-ink">
                        {sub.normalized_merchant}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-accentLight text-[10px] font-bold text-primaryDark">
                        {sub.cadence} ({sub.occurrences}x)
                      </span>
                      {sub.price_hike_pct > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                          +{sub.price_hike_pct}% Price Hike
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      Last: {sub.last_charged_date} · Next expected:{" "}
                      <strong className="text-ink">{sub.next_expected_date}</strong>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-primary">
                      {formatINR(sub.latest_amount)}
                    </p>
                    <p className="text-[10px] text-muted">{sub.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flagged Spend Anomalies */}
          <div className="lg:col-span-6 bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  Flagged Spend Anomalies (Unusually Large Spends)
                </h2>
                <p className="text-xs text-muted">
                  Per-category robust z-score &amp; median-multiplier outlier detector
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-extrabold">
                {anomalies.length} Flagged
              </span>
            </div>

            <div className="space-y-3">
              {anomalies.map((anom) => (
                <div
                  key={anom.id}
                  className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-ink">
                      {anom.normalized_merchant}
                    </span>
                    <span className="text-sm font-extrabold text-amber-900">
                      {formatINR(anom.amount)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs">
                    <span className="font-semibold text-amber-800">{anom.anomaly_reason}</span>
                    <span className="text-muted">
                      {anom.tx_date} · {anom.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Budget Guardrails & Telegram Alert Dispatcher */}
      {activeTab === "budgets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  Monthly Category Budget Guardrails ({summary.active_month})
                </h2>
                <p className="text-xs text-muted">
                  Adjust monthly limits below; alerts fire at 80% utilization
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveBudgets}
                disabled={savingBudgets}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primaryDark transition shadow-pinkSm"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{savingBudgets ? "Saving..." : "Save Budget Limits"}</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {budgets.map((b) => {
                const barColor =
                  b.status === "exceeded"
                    ? "bg-red-600"
                    : b.status === "warning"
                    ? "bg-amber-500"
                    : "bg-primary";
                return (
                  <div key={b.category} className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                      <span className="font-bold text-ink">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted">
                          Spent: <strong className="text-ink">{formatINR(b.spent_active_month)}</strong> /
                        </span>
                        <input
                          type="number"
                          aria-label={`Monthly budget limit for ${b.category}`}
                          value={budgetEdits[b.category] ?? b.monthly_limit}
                          onChange={(e) =>
                            setBudgetEdits({
                              ...budgetEdits,
                              [b.category]: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded-lg border border-accentLight text-right font-bold text-ink"
                        />
                        <span className="w-12 text-right font-bold text-primaryDark">
                          {b.utilization_pct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-soft rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all`}
                        style={{ width: `${Math.min(100, b.utilization_pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telegram Bot Alert Integration */}
          <div className="lg:col-span-5 bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-ink">
                Telegram Bot Budget &amp; Anomaly Alert
              </h2>
              <p className="text-xs text-muted">
                Generate &amp; dispatch an instant summary of budget breaches, anomaly flags, and
                next-month forecast via the Telegram Bot API.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTelegramAlert}
              className="w-full py-3 rounded-full bg-primary text-white text-xs font-bold hover:bg-primaryDark transition flex items-center justify-center gap-2 shadow-pinkSm"
            >
              <Send className="w-4 h-4" />
              <span>Generate &amp; Send Telegram Alert Digest</span>
            </button>

            {telegramPreview && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-primaryDark bg-soft px-3 py-1 rounded-lg">
                  Status: {telegramStatus}
                </p>
                <pre className="p-3.5 rounded-xl bg-blush border border-accentLight text-xs font-mono text-ink whitespace-pre-wrap">
                  {telegramPreview}
                </pre>
              </div>
            )}

            <div className="pt-2 border-t border-soft text-xs text-muted flex items-center justify-between">
              <span>Configure Telegram Chat ID or Income Target:</span>
              <Link href="/app/settings" className="text-primary font-bold underline">
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
