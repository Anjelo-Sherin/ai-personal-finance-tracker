import type { Metadata } from "next";
import { AuthFormClient } from "@/components/ui/AuthFormClient";

export const metadata: Metadata = {
  title: "Log In to Your Finance Dashboard",
  description: "Log in or launch the 1-click demo to access your categorized transactions, recurring bills, and spend forecasts.",
};

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-primaryDark bg-soft px-3 py-1 rounded-full">
          Welcome Back
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
          Log In to PaisaPulse
        </h1>
        <p className="text-xs text-muted">
          Access your smart expense tracker, active learning models &amp; monthly forecast.
        </p>
      </div>
      <AuthFormClient mode="login" />
    </div>
  );
}
