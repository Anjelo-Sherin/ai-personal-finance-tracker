import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/SiteShell";

export const metadata: Metadata = {
  title: "Privacy & Row-Level Security Policy",
  description: "Privacy by design, zero banking credential storage, and PostgreSQL Row-Level Security (RLS) policies in PaisaPulse.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs items={[{ label: "Privacy Policy" }]} />
      <h1 className="text-3xl font-extrabold text-ink">Privacy &amp; Row-Level Security Policy</h1>
      <div className="bg-white rounded-card border border-accentLight p-6 shadow-pinkSm space-y-4 text-sm text-muted leading-relaxed">
        <h2 className="text-base font-bold text-ink">1. Strict Per-User Row Isolation</h2>
        <p>
          Every financial transaction, category correction, and budget record is strictly isolated by <code>user_id</code>.
          In PostgreSQL, this is enforced through native Row-Level Security (RLS) policies. In SQLite, it is enforced at the query level.
          No user can query or modify another user&apos;s financial data.
        </p>

        <h2 className="text-base font-bold text-ink">2. Zero Banking Credentials Stored</h2>
        <p>
          PaisaPulse never prompts for or stores bank logins, netbanking passwords, UPI MPINs, card CVVs, or full account numbers.
          Account numbers in SMS text (e.g. <code>A/c XX4821</code>) are stripped or treated as anonymous tokens.
        </p>

        <h2 className="text-base font-bold text-ink">3. Human-in-the-Loop Active Learning Privacy</h2>
        <p>
          Category corrections you provide are stored in your personal profile to refine predictions for your own account.
          They are not shared with other users or external third parties.
        </p>
      </div>
    </div>
  );
}
