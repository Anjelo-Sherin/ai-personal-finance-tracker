"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mail, User } from "lucide-react";
import { apiFetch, setStoredToken, UserProfile } from "@/lib/api";

export function AuthFormClient({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "signup" ? "/api/v1/auth/signup" : "/api/v1/auth/login";
      const payload =
        mode === "signup" ? { name, email, password } : { email, password };
      const res = await apiFetch<{ access_token: string; user: UserProfile }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setStoredToken(res.access_token);
      router.push("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ access_token: string; user: UserProfile }>(
        "/api/v1/auth/demo",
        { method: "POST" }
      );
      setStoredToken(res.access_token);
      router.push("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demo login failed");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-card border-2 border-accentLight p-6 sm:p-8 shadow-pink max-w-md mx-auto">
      <div className="mb-6">
        <button
          type="button"
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full py-3 px-4 rounded-full bg-soft text-primaryDark font-bold text-sm hover:bg-accentLight/60 transition flex items-center justify-center gap-2 border border-accentLight"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {demoLoading
              ? "Opening 3-Month Demo Portfolio..."
              : "Skip Login · Launch 1-Click Demo Account"}
          </span>
        </button>
      </div>

      <div className="relative flex py-2 items-center mb-6">
        <div className="flex-grow border-t border-soft" />
        <span className="flex-shrink mx-3 text-xs text-muted uppercase font-semibold">
          or use email
        </span>
        <div className="flex-grow border-t border-soft" />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="auth-name" className="block text-xs font-bold text-ink mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-muted absolute left-3.5 top-3" />
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Mehta"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="block text-xs font-bold text-ink mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-xs font-bold text-ink mb-1.5">
            Password {mode === "signup" && "(min 10 characters)"}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              id="auth-password"
              type="password"
              required
              minLength={mode === "signup" ? 10 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-primaryDark transition shadow-pinkSm"
        >
          {loading
            ? "Please wait..."
            : mode === "signup"
            ? "Create Account & Seed Starter Data"
            : "Log In to Dashboard"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to PaisaPulse?{" "}
            <Link href="/signup" className="text-primary font-bold underline">
              Create free account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
