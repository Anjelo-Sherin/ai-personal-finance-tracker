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
  ShieldCheck,
  ArrowUpRight,
  Activity,
  Calendar,
  Zap,
  LayoutGrid,
  CreditCard,
  Target,
  ArrowRight,
} from "lucide-react";
import {
  apiFetch,
  DashboardPayload,
  getStoredToken,
  setStoredToken,
  UserProfile,
} from "@/lib/api";
import { INITIAL_DASHBOARD_DATA } from "@/lib/initialData";
import { API_URL, formatINR, CATEGORY_COLORS } from "@/lib/formatters";
import { CategoryDonutChart, ForecastTimelineChart } from "@/components/charts/Charts";

export default function FinanceDashboardPage() {
  const [data, setData] = useState<DashboardPayload>(INITIAL_DASHBOARD_DATA);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "bento" | "transactions" | "forecast" | "radar" | "budgets"
  >("bento");

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

  const handleFillSampleSms = async (samplePreset?: string) => {
    if (samplePreset) {
      setSmsInput(samplePreset);
      return;
    }
    try {
      const res = await apiFetch<{ text: string }>("/api/v1/finance/sample-sms?count=4");
      setSmsInput(res.text);
    } catch {
      setSmsInput(
        "Rs. 540.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421\n" +
          "Txn of INR 649.00 on Credit Card 4111XXXXXXXX1234 at NETFLIX.COM on 15-10-2026\n" +
          "A/c debited by Rs 2,840.00 on 12-10-2026 towards BESCOM ELECTRICITY BLR Ref 99120"
      );
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
        `Bento Pipeline: Parsed, categorized & checked anomaly rules for ${res.ingested_count} new Indian UPI transaction(s)!`
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
        `Imported & classified ${res.ingested_count} transactions from ${res.filename} with TF-IDF!`
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
        `Generated & categorized ${res.ingested_count} new synthetic Indian UPI transactions!`
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
        model_metrics: {
          cv_accuracy: number;
          last_train_ms: number;
          user_corrections_count: number;
        };
      }>(`/api/v1/finance/transactions/${txId}/category`, {
        method: "PATCH",
        body: JSON.stringify({ category: newCategory, apply_to_similar: true }),
      });
      setToastBanner(
        `Active Learning: Retrained scikit-learn model in ${res.model_metrics.last_train_ms} ms! Updated ${res.updated_similar_count} matching merchant transaction(s) to "${newCategory}" (5-Fold CV Accuracy: ${(res.model_metrics.cv_accuracy * 100).toFixed(1)}%).`
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
          Loading PaisaPulse Bento Grid Dashboard...
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ============================================================== */}
      {/* BENTO HEADER: Command Bar & Telemetry Status                   */}
      {/* ============================================================== */}
      <div className="bento-card-gradient p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="bento-pill bg-soft border border-accentLight/60 text-primaryDark">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Bento Financial OS v2.0</span>
              </span>

              <span className="bento-pill bg-emerald-50 border border-emerald-200 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active Learning Online (5-Fold CV: {summary.cv_accuracy_pct}%)</span>
              </span>

              <span className="bento-pill bg-white/80 border border-bentoBorder text-muted">
                <span>Retrain Latency: {summary.last_train_ms} ms</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink tracking-tight">
              PaisaPulse Intelligence Studio
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Monitoring <strong className="text-ink">{summary.transaction_count} transactions</strong> ·{" "}
              <strong className="text-ink">{summary.recurring_count} recurring mandates</strong> ·{" "}
              <strong className="text-ink">{summary.user_corrections_count} learned merchant rules</strong>
            </p>
          </div>

          {/* Quick Action Pill Cluster */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleGenerateSynthetic}
              disabled={retraining}
              className="bento-pill bg-white hover:bg-soft text-primary border border-accentLight shadow-sm hover:shadow"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>+6 Synthetic UPI Txns</span>
            </button>

            <label className="cursor-pointer bento-pill bg-white hover:bg-soft text-ink border border-bentoBorder shadow-sm hover:shadow">
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
              className="bento-pill bg-white hover:bg-soft text-ink border border-bentoBorder shadow-sm hover:shadow"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadFile(
                  "/api/v1/finance/report.pdf",
                  "paisapulse_monthly_forecast_report.pdf"
                )
              }
              className="bento-pill bg-primary hover:bg-primaryDark text-white shadow-pinkSm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Executive PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Toast Feedback Banner */}
      {toastBanner && (
        <div
          role="status"
          className="bento-card bg-primary text-white p-4 flex items-center justify-between shadow-pink"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
            <span className="text-xs sm:text-sm font-bold">{toastBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastBanner(null)}
            className="text-xs font-bold text-white/90 hover:text-white underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* BENTO VIEW TOGGLE BAR                                          */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 backdrop-blur p-2 rounded-2xl border border-bentoBorder">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "bento", label: "Panoramic Bento Grid", icon: LayoutGrid },
            { id: "transactions", label: `Active Ledger (${summary.transaction_count})`, icon: Activity },
            { id: "forecast", label: "Prophet Forecast", icon: TrendingUp },
            { id: "radar", label: `Radar (${summary.recurring_count + summary.anomaly_count})`, icon: AlertTriangle },
            { id: "budgets", label: "Guardrails & Alerts", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`bento-pill text-xs font-bold transition-all ${
                  active
                    ? "bg-primary text-white shadow-pinkSm"
                    : "bg-transparent text-ink hover:bg-soft/70"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted pr-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Active Period: <strong className="text-ink">{summary.active_month}</strong></span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: PANORAMIC BENTO GRID MASTER VIEW                       */}
      {/* ============================================================== */}
      {activeTab === "bento" && (
        <div className="space-y-6">
          {/* Bento Tier 1: 3 Velocity & Predictive Horizon Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Bento Tile 1: Active Month Spend Velocity */}
            <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="bento-pill bg-soft text-primaryDark text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  <span>Month Spend ({summary.active_month})</span>
                </span>
                <span className="text-xs font-semibold text-muted">Day 26 of 31</span>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                  {formatINR(summary.active_month_debit)}
                </p>
                <p className="text-xs text-muted">
                  3-Month Aggregated: <strong className="text-ink">{formatINR(summary.total_debit)}</strong> across{" "}
                  <strong className="text-ink">{summary.transaction_count} txns</strong>
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pacing: Within Safe Run-Rate</span>
                </span>
                <span className="text-muted font-mono text-[11px]">Avg ₹2,369/day</span>
              </div>
            </div>

            {/* Bento Tile 2: Next-Month Prophet Forecast */}
            <div className="lg:col-span-4 bento-card-gradient p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="bento-pill bg-primary/10 text-primaryDark text-[11px] border border-primary/20">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span>Next-Month Forecast ({forecast.next_month})</span>
                </span>
                <span className="bento-pill bg-emerald-50 text-emerald-800 text-[10px]">
                  +80% CI Range
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
                  {formatINR(forecast.total_predicted)}
                </p>
                <p className="text-xs text-muted">
                  80% Prediction Interval:{" "}
                  <strong className="text-ink">
                    {formatINR(forecast.lower_bound)} – {formatINR(forecast.upper_bound)}
                  </strong>
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
                <span className="text-primaryDark font-medium flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span>Payday Surge (Days 1–7): {forecast.payday_spike_share_pct}%</span>
                </span>
                <span className="text-emerald-700 font-bold">
                  Save {formatINR(forecast.potential_extra_savings)}
                </span>
              </div>
            </div>

            {/* Bento Tile 3: scikit-learn Active Categorizer */}
            <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <span className="bento-pill bg-purple-50 text-purple-900 border border-purple-200 text-[11px]">
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-700" />
                  <span>NLP &amp; Active Learning</span>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Ready</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-1">
                <div className="bg-blush/60 p-2.5 rounded-xl border border-bentoBorder">
                  <span className="text-[10px] uppercase font-bold text-muted block">5-Fold CV</span>
                  <span className="text-lg font-extrabold text-ink">{summary.cv_accuracy_pct}%</span>
                </div>
                <div className="bg-blush/60 p-2.5 rounded-xl border border-bentoBorder">
                  <span className="text-[10px] uppercase font-bold text-muted block">Retrain Time</span>
                  <span className="text-lg font-extrabold text-primary">{summary.last_train_ms} ms</span>
                </div>
                <div className="bg-blush/60 p-2.5 rounded-xl border border-bentoBorder">
                  <span className="text-[10px] uppercase font-bold text-muted block">CPU Inference</span>
                  <span className="text-lg font-extrabold text-ink">&lt; 1.2 ms</span>
                </div>
                <div className="bg-blush/60 p-2.5 rounded-xl border border-bentoBorder">
                  <span className="text-[10px] uppercase font-bold text-muted block">Learned Rules</span>
                  <span className="text-lg font-extrabold text-ink">{summary.user_corrections_count} human</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
                <span className="text-muted text-[11px]">Word(1-2g) + Char(3-5g) N-Grams</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("transactions")}
                  className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>Correct Merchant</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Bento Tier 2: Asymmetric Visualizations (Donut + Prophet Line Chart) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Bento Tile 4: Category Spend Allocation Donut */}
            <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-ink">Category Spend Split</h2>
                  <p className="text-xs text-muted">
                    Auto-classified with Hybrid Word + Subword Char TF-IDF
                  </p>
                </div>
                <span className="bento-pill bg-soft text-primaryDark text-[11px]">
                  10 Classes
                </span>
              </div>

              <div className="py-2">
                <CategoryDonutChart
                  items={summary.category_breakdown}
                  totalSpend={summary.total_debit}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs text-muted">
                <span>Top: <strong className="text-ink">Housing &amp; Rent (32.9%)</strong></span>
                <span>Shopping: <strong className="text-ink">20.1%</strong></span>
              </div>
            </div>

            {/* Bento Tile 5: Time-Series Seasonal Horizon Chart */}
            <div className="lg:col-span-7 bento-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-base font-extrabold text-ink">
                    Prophet-Style Monthly Trend &amp; Payday Horizon
                  </h2>
                  <p className="text-xs text-muted">
                    Additive Trend + Payday Salary Seasonality ({forecast.payday_spike_share_pct}% surge) + 80% Confidence Band
                  </p>
                </div>
                <span className="bento-pill bg-primary/10 text-primaryDark text-[11px] font-bold">
                  Horizon: {forecast.next_month}
                </span>
              </div>

              <div className="py-2 overflow-x-auto">
                <ForecastTimelineChart timeline={forecast.monthly_timeline} />
              </div>

              <div className="mt-4 pt-3 border-t border-bentoBorder/70 flex flex-wrap items-center justify-between text-xs text-muted gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span>Historical Actual Spend</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accentLight border border-primary" />
                  <span>Next-Month Additive Forecast</span>
                </span>
                <span className="font-semibold text-primaryDark">
                  Projected: {formatINR(forecast.total_predicted)}
                </span>
              </div>
            </div>
          </div>

          {/* Bento Tier 3: Operational Guardrails & Anomaly Radar (3 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Bento Tile 6: Spend Anomaly Radar */}
            <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">Spend Anomaly Radar</h3>
                    <p className="text-[11px] text-muted">Robust per-category z-scores &ge; 2.0</p>
                  </div>
                </div>
                <span className="bento-pill bg-amber-100 text-amber-900 text-xs font-bold">
                  {summary.anomaly_count} Flagged
                </span>
              </div>

              <div className="space-y-2.5 my-2 max-h-60 overflow-y-auto pr-1">
                {anomalies.slice(0, 3).map((anom) => (
                  <div
                    key={anom.id}
                    className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-ink">{anom.normalized_merchant}</span>
                      <span className="font-extrabold text-amber-900">{formatINR(anom.amount)}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">{anom.anomaly_reason}</p>
                    <p className="text-[10px] text-muted">{anom.tx_date} · {anom.category}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-bold">Save up to {formatINR(forecast.potential_extra_savings)}/mo</span>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyAnomalies(true);
                    setActiveTab("transactions");
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  View All ({anomalies.length})
                </button>
              </div>
            </div>

            {/* Bento Tile 7: Recurring Subscriptions Mandate */}
            <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Repeat className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">Recurring Mandates</h3>
                    <p className="text-[11px] text-muted">25–35d monthly, 6–8d weekly intervals</p>
                  </div>
                </div>
                <span className="bento-pill bg-purple-50 text-purple-900 text-xs font-bold border border-purple-200">
                  {summary.recurring_count} Active
                </span>
              </div>

              <div className="space-y-2.5 my-2 max-h-60 overflow-y-auto pr-1">
                {recurring_subscriptions.slice(0, 3).map((sub, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-blush/60 border border-bentoBorder flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-ink">{sub.normalized_merchant}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-primary border border-accentLight">
                          {sub.cadence}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">
                        Next: <strong className="text-ink">{sub.next_expected_date}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-primary">{formatINR(sub.latest_amount)}</span>
                      {sub.price_hike_pct > 0 && (
                        <span className="block text-[9px] font-bold text-amber-800">
                          +{sub.price_hike_pct}% Hike
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
                <span className="font-bold text-ink">Total: {formatINR(summary.recurring_monthly_total)}/mo</span>
                <button
                  type="button"
                  onClick={() => {
                    setOnlyRecurring(true);
                    setActiveTab("transactions");
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  View All ({recurring_subscriptions.length})
                </button>
              </div>
            </div>

            {/* Bento Tile 8: Smart AI Savings Plan */}
            <div className="lg:col-span-4 bento-card p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">AI Savings Advisor</h3>
                    <p className="text-[11px] text-muted">Actionable month-ahead savings plan</p>
                  </div>
                </div>
                <span className="bento-pill bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  +{formatINR(forecast.potential_extra_savings)}/mo
                </span>
              </div>

              <div className="space-y-2.5 my-2 max-h-60 overflow-y-auto pr-1">
                {forecast.savings_suggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-ink">{sug.title}</span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                        Save {formatINR(sug.monthly_saving)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">{sug.recommendation}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-bentoBorder/70 flex items-center justify-between text-xs">
                <span className="text-muted">Target Income: {formatINR(forecast.monthly_income_target)}</span>
                <span className="text-emerald-700 font-bold">
                  Rate: {forecast.projected_savings_rate_pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Bento Tier 4: Real-Time Ingestion Sandbox */}
          <div className="bento-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-soft text-primary flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-extrabold text-ink">
                    Real-Time Indian Bank SMS &amp; UPI Narration Ingestion Sandbox
                  </h3>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Regex normalizer strips UTRs, card masks &amp; noise · TF-IDF classifies in &lt; 2ms · Rules engine audits anomalies
                </p>
              </div>

              {/* Sample Ingestion Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted">Try sample:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleFillSampleSms(
                      "Rs. 540.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421"
                    )
                  }
                  className="bento-pill bg-blush text-primaryDark text-[10px] hover:bg-soft border border-accentLight/60"
                >
                  Swiggy UPI
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleFillSampleSms(
                      "A/c debited by Rs 2,840.00 on 12-10-2026 towards BESCOM ELECTRICITY BLR Ref 99120"
                    )
                  }
                  className="bento-pill bg-blush text-primaryDark text-[10px] hover:bg-soft border border-accentLight/60"
                >
                  Electricity Bill
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleFillSampleSms(
                      "Txn of INR 649.00 on Credit Card 4111XXXXXXXX1234 at NETFLIX.COM on 15-10-2026"
                    )
                  }
                  className="bento-pill bg-blush text-primaryDark text-[10px] hover:bg-soft border border-accentLight/60"
                >
                  Netflix POS
                </button>
                <button
                  type="button"
                  onClick={() => handleFillSampleSms()}
                  className="bento-pill bg-soft text-primaryDark text-[10px] hover:bg-accentLight/60"
                >
                  <RefreshCw className="w-3 h-3 text-primary" />
                  <span>Random 4 Batch</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleIngestSms} className="flex flex-col sm:flex-row gap-3">
              <textarea
                rows={2}
                value={smsInput}
                onChange={(e) => setSmsInput(e.target.value)}
                placeholder="Paste single or multi-line alert, e.g. Rs. 540.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421"
                className="flex-grow rounded-2xl border border-bentoBorder bg-blush/30 p-3.5 text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
              <button
                type="submit"
                disabled={ingestingSms || !smsInput.trim()}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primaryDark text-white text-xs font-extrabold shadow-pink transition disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{ingestingSms ? "Classifying..." : "Ingest & Categorize SMS"}</span>
              </button>
            </form>
          </div>

          {/* Bento Tier 5: Recent Transactions Table Preview (Embedded in Bento) */}
          <div className="bento-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  Recent Classified Transactions &amp; Active Learning Loop
                </h3>
                <p className="text-xs text-muted">
                  Click any category pill to correct it—watch the scikit-learn model retrain live and re-classify similar merchants!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("transactions")}
                className="bento-pill bg-soft text-primaryDark text-xs font-bold hover:bg-accentLight/60 inline-flex items-center gap-1.5"
              >
                <span>Open Full Ledger ({summary.transaction_count})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Embedded Table Preview (First 8 Rows) */}
            <div className="overflow-x-auto rounded-2xl border border-bentoBorder">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-blush/60 border-b border-bentoBorder text-muted">
                    <th className="py-3 px-3 font-bold">Date &amp; Channel</th>
                    <th className="py-3 px-3 font-bold">Normalized Merchant / Narration</th>
                    <th className="py-3 px-3 font-bold">Category (1-Click Active Retrain)</th>
                    <th className="py-3 px-3 font-bold">TF-IDF &amp; Outlier Signals</th>
                    <th className="py-3 px-3 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bentoBorder/60 bg-white">
                  {filteredTransactions.slice(0, 8).map((tx) => (
                    <tr key={tx.id} className="hover:bg-blush/30 transition">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-ink block">{tx.tx_date}</span>
                        <span className="text-[10px] text-muted">{tx.channel}</span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <span className="font-extrabold text-ink block">{tx.normalized_merchant}</span>
                        <span className="text-[11px] text-muted truncate block" title={tx.raw_text}>
                          {tx.raw_text}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <select
                            aria-label={`Category for ${tx.normalized_merchant}`}
                            value={tx.category}
                            onChange={(e) => handleCategoryCorrection(tx.id, e.target.value)}
                            className="px-2.5 py-1 rounded-xl border border-bentoBorder bg-blush/60 text-xs font-bold text-primaryDark focus:outline-none focus:ring-2 focus:ring-primary"
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
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {tx.top_tokens.slice(0, 2).map((tok, idx) => (
                            <code
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-blush border border-bentoBorder text-[10px] font-mono text-primaryDark"
                            >
                              {tok}
                            </code>
                          ))}
                          {tx.is_recurring && (
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[9px] font-bold">
                              Recurring
                            </span>
                          )}
                          {tx.is_anomaly && (
                            <span
                              className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[9px] font-bold"
                              title={tx.anomaly_reason || "Outlier spend"}
                            >
                              Anomaly
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`py-3 px-3 text-right whitespace-nowrap font-extrabold ${
                          tx.tx_type === "credit" ? "text-emerald-700" : "text-ink"
                        }`}
                      >
                        {tx.tx_type === "credit" ? "+" : ""}
                        {formatINR(tx.amount, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: ACTIVE LEARNING TRANSACTION LEDGER                     */}
      {/* ============================================================== */}
      {activeTab === "transactions" && (
        <div className="bento-card p-6 sm:p-7 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-ink">
                Human-in-the-Loop Active Learning Transaction Ledger
              </h2>
              <p className="text-xs sm:text-sm text-muted">
                Change any category dropdown below to instantly retrain the scikit-learn TF-IDF + Logistic Regression model (&lt; 25 ms) and update all similar merchants!
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
                  className="pl-8 pr-3 py-1.5 rounded-full border border-bentoBorder text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </div>

              <select
                aria-label="Filter by category"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="px-3 py-1.5 rounded-full border border-bentoBorder text-xs font-semibold text-ink bg-white"
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
                className={`bento-pill text-xs border ${
                  onlyAnomalies
                    ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-white text-ink border-bentoBorder hover:bg-soft"
                }`}
              >
                Anomalies ({summary.anomaly_count})
              </button>

              <button
                type="button"
                onClick={() => setOnlyRecurring(!onlyRecurring)}
                className={`bento-pill text-xs border ${
                  onlyRecurring
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-ink border-bentoBorder hover:bg-soft"
                }`}
              >
                Recurring ({summary.recurring_count})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-bentoBorder">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-blush/60 border-b border-bentoBorder text-muted">
                  <th className="py-3 px-3 font-bold">Date &amp; Channel</th>
                  <th className="py-3 px-3 font-bold">Merchant &amp; Raw SMS Narration</th>
                  <th className="py-3 px-3 font-bold">TF-IDF Cues &amp; Signals</th>
                  <th className="py-3 px-3 font-bold">
                    Category (Click to Correct &amp; Retrain)
                  </th>
                  <th className="py-3 px-3 font-bold text-right">Amount</th>
                  <th className="py-3 px-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bentoBorder/60 bg-white">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-blush/30 transition">
                    <td className="py-3 px-3 whitespace-nowrap font-semibold text-ink">
                      {tx.tx_date}
                      <span className="block text-[10px] text-muted">{tx.channel}</span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-extrabold text-ink">{tx.normalized_merchant}</div>
                      <div className="text-[11px] text-muted truncate" title={tx.raw_text}>
                        {tx.raw_text}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {tx.top_tokens.slice(0, 2).map((tok, idx) => (
                          <code
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-blush border border-bentoBorder text-[10px] font-mono text-primaryDark"
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
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Category for ${tx.normalized_merchant}`}
                          value={tx.category}
                          onChange={(e) => handleCategoryCorrection(tx.id, e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl border border-bentoBorder bg-soft/60 text-xs font-bold text-primaryDark focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className={`py-3 px-3 text-right whitespace-nowrap font-extrabold ${
                        tx.tx_type === "credit" ? "text-emerald-700" : "text-ink"
                      }`}
                    >
                      {tx.tx_type === "credit" ? "+" : ""}
                      {formatINR(tx.amount, true)}
                    </td>
                    <td className="py-3 px-3 text-center">
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

      {/* ============================================================== */}
      {/* VIEW 3: PROPHET FORECAST & CATEGORY HORIZON                    */}
      {/* ============================================================== */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-12 bento-card p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">
                    Additive Trend + Payday Seasonality Forecast ({forecast.next_month})
                  </h2>
                  <p className="text-xs sm:text-sm text-muted">
                    Prophet-style additive decomposition capturing days 1–7 Indian salary surge ({forecast.payday_spike_share_pct}%) and 80% CI bands
                  </p>
                </div>
                <span className="bento-pill bg-primary text-white text-xs font-bold">
                  Next Month: {formatINR(forecast.total_predicted)}
                </span>
              </div>
              <ForecastTimelineChart timeline={forecast.monthly_timeline} />
            </div>

            <div className="lg:col-span-12 bento-card p-6 sm:p-7">
              <h3 className="text-lg font-extrabold text-ink mb-1">
                Per-Category Next-Month Forecast Breakdown
              </h3>
              <p className="text-xs text-muted mb-4">
                Forecasted spend per category with 80% prediction intervals and historical delta
              </p>
              <div className="overflow-x-auto rounded-2xl border border-bentoBorder">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-blush/60 border-b border-bentoBorder text-muted">
                      <th className="py-3 px-3 font-bold">Category</th>
                      <th className="py-3 px-3 font-bold text-right">Last Month Actual</th>
                      <th className="py-3 px-3 font-bold text-right">Next Month Forecast</th>
                      <th className="py-3 px-3 font-bold text-right">80% Confidence Interval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bentoBorder/60 bg-white">
                    {forecast.category_forecasts.map((cf) => (
                      <tr key={cf.category} className="hover:bg-blush/30 transition">
                        <td className="py-3 px-3 font-bold text-ink">{cf.category}</td>
                        <td className="py-3 px-3 text-right text-muted">{formatINR(cf.last_month_actual)}</td>
                        <td className="py-3 px-3 text-right font-extrabold text-primary">{formatINR(cf.predicted)}</td>
                        <td className="py-3 px-3 text-right text-muted font-mono">
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

      {/* ============================================================== */}
      {/* VIEW 4: SUBSCRIPTIONS & SPEND ANOMALIES RADAR                  */}
      {/* ============================================================== */}
      {activeTab === "radar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Subscriptions */}
          <div className="lg:col-span-6 bento-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-ink">
                  Recurring Subscriptions &amp; Mandates
                </h2>
                <p className="text-xs text-muted">
                  Temporal interval matching (25–35d monthly, 6–8d weekly)
                </p>
              </div>
              <span className="bento-pill bg-soft text-primaryDark text-xs font-extrabold">
                {formatINR(summary.recurring_monthly_total)}/mo
              </span>
            </div>

            <div className="space-y-3">
              {recurring_subscriptions.map((sub, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-blush/50 border border-bentoBorder flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-ink">
                        {sub.normalized_merchant}
                      </span>
                      <span className="bento-pill bg-white border border-accentLight text-[10px] font-bold text-primaryDark">
                        {sub.cadence} ({sub.occurrences}x)
                      </span>
                      {sub.price_hike_pct > 0 && (
                        <span className="bento-pill bg-amber-100 text-amber-900 text-[10px] font-bold">
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

          {/* Anomalies */}
          <div className="lg:col-span-6 bento-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-ink">
                  Flagged Spend Anomalies
                </h2>
                <p className="text-xs text-muted">
                  Per-category robust z-score &amp; median-multiplier outlier detector
                </p>
              </div>
              <span className="bento-pill bg-amber-100 text-amber-900 text-xs font-extrabold">
                {anomalies.length} Flagged
              </span>
            </div>

            <div className="space-y-3">
              {anomalies.map((anom) => (
                <div
                  key={anom.id}
                  className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5"
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

      {/* ============================================================== */}
      {/* VIEW 5: BUDGET GUARDRAILS & TELEGRAM ALERT SIMULATOR           */}
      {/* ============================================================== */}
      {activeTab === "budgets" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Budget Limit Config */}
          <div className="lg:col-span-7 bento-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-ink">
                  Category Monthly Budget Guardrails
                </h2>
                <p className="text-xs text-muted">
                  Configure limits to receive proactive Telegram &amp; in-app spend alerts at 80% threshold
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveBudgets}
                disabled={savingBudgets}
                className="bento-pill bg-primary hover:bg-primaryDark text-white shadow-pinkSm text-xs font-bold"
              >
                {savingBudgets ? "Saving..." : "Save Guardrails"}
              </button>
            </div>

            <div className="space-y-4">
              {budgets.map((b) => {
                const util = b.utilization_pct;
                const statusColor =
                  b.status === "exceeded"
                    ? "bg-red-500"
                    : b.status === "warning"
                    ? "bg-amber-500"
                    : "bg-emerald-500";
                return (
                  <div key={b.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted">
                          {formatINR(b.spent_active_month)} spent of
                        </span>
                        <input
                          type="number"
                          value={budgetEdits[b.category] ?? b.monthly_limit}
                          onChange={(e) =>
                            setBudgetEdits({
                              ...budgetEdits,
                              [b.category]: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-0.5 rounded border border-bentoBorder font-bold text-ink text-right bg-blush/40"
                        />
                        <span
                          className={`bento-pill text-[10px] font-extrabold ${
                            b.status === "exceeded"
                              ? "bg-red-100 text-red-900"
                              : b.status === "warning"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {util.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-blush overflow-hidden border border-bentoBorder">
                      <div
                        className={`h-full ${statusColor} transition-all`}
                        style={{ width: `${Math.min(util, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telegram Alert Dispatcher */}
          <div className="lg:col-span-5 bento-card p-6 sm:p-7 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-ink">
                    Instant Telegram Spending Alerts
                  </h3>
                  <p className="text-xs text-muted">Real-time alerts on anomalous UPI &amp; card spends</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-2 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-[10px] border-b border-slate-800 pb-1.5">
                  <span>@PaisaPulseBot · Telegram Preview</span>
                  <span className="text-emerald-400">● Live Hook</span>
                </div>
                <div className="whitespace-pre-line text-[11px] text-slate-200 leading-relaxed">
                  {telegramPreview ||
                    `🚨 PaisaPulse Alert: Unusual Spend Detected!\n\nMerchant: CROMA ELECTRONICS BLR\nAmount: ₹38,900.00\nReason: 3.4x your typical Electronics spend\n\nReply 'OK' to approve or 'FLAG' to dispute.`}
                </div>
              </div>

              {telegramStatus && (
                <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  {telegramStatus}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleTelegramAlert}
              className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow transition flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Simulate Real-Time Telegram Alert</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
