import type { Metadata } from "next";
import { AuthFormClient } from "@/components/ui/AuthFormClient";

export const metadata: Metadata = {
  title: "Create Free Account",
  description: "Sign up for PaisaPulse to auto-categorize bank statements, track recurring bills, and forecast monthly spend.",
};

export default function SignupPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-primaryDark bg-soft px-3 py-1 rounded-full">
          Start Free
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
          Create Your Free Account
        </h1>
        <p className="text-xs text-muted">
          Your account will be pre-seeded with 3 months of categorized Indian UPI &amp; bank data.
        </p>
      </div>
      <AuthFormClient mode="signup" />
    </div>
  );
}
