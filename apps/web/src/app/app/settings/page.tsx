"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiFetch, UserProfile } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [incomeTarget, setIncomeTarget] = useState(85000);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: UserProfile }>("/api/v1/auth/me")
      .then((res) => {
        setUser(res.user);
        setName(res.user.name);
        setIncomeTarget(res.user.monthly_income_target || 85000);
        setTelegramChatId(res.user.telegram_chat_id || "");
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiFetch<{ user: UserProfile }>("/api/v1/auth/me", {
      method: "PATCH",
      body: JSON.stringify({
        name,
        monthly_income_target: Number(incomeTarget),
        telegram_chat_id: telegramChatId,
      }),
    });
    setUser(res.user);
    setSavedMsg("Profile, income target, and Telegram alert preferences saved!");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Link
        href="/app"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to AI Finance Dashboard</span>
      </Link>

      <div className="bg-white rounded-card border-2 border-accentLight p-6 sm:p-8 shadow-pink space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Account &amp; Alert Settings</h1>
          <p className="text-xs text-muted mt-1">
            Configure your monthly income target for net savings calculations and optional
            Telegram Chat ID for budget alerts.
          </p>
        </div>

        {savedMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{savedMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="set-name" className="block text-xs font-bold text-ink mb-1">
              Display Name
            </label>
            <input
              id="set-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="set-income" className="block text-xs font-bold text-ink mb-1">
              Monthly Income Target (₹ INR)
            </label>
            <input
              id="set-income"
              type="number"
              value={incomeTarget}
              onChange={(e) => setIncomeTarget(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="set-tg" className="block text-xs font-bold text-ink mb-1">
              Telegram Chat ID (Optional — for BotFather Budget Alerts)
            </label>
            <input
              id="set-tg"
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="e.g. 123456789"
              className="w-full px-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-primary text-white text-xs font-bold hover:bg-primaryDark transition shadow-pinkSm"
          >
            Save Preferences
          </button>
        </form>

        {user && (
          <div className="pt-4 border-t border-soft text-xs text-muted">
            Signed in as <strong className="text-ink">{user.email}</strong> · Row-Level User ID:{" "}
            <code className="font-mono">{user.id}</code>
          </div>
        )}
      </div>
    </div>
  );
}
