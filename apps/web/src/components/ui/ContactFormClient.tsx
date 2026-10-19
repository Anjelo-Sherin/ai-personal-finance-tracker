"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export function ContactFormClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/v1/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, organization, message }),
      });
      router.push("/thank-you");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-card border-2 border-accentLight p-6 sm:p-8 shadow-pink space-y-4"
    >
      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="contact-name" className="block text-xs font-bold text-ink mb-1.5">
          Your Name
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Anjelo Sherin"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-xs font-bold text-ink mb-1.5">
          Email Address
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="contact-org" className="block text-xs font-bold text-ink mb-1.5">
          Organization / Team (Optional)
        </label>
        <input
          id="contact-org"
          type="text"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Fintech / University / Hiring Team"
        />
      </div>

      <div>
        <label htmlFor="contact-msg" className="block text-xs font-bold text-ink mb-1.5">
          Message
        </label>
        <textarea
          id="contact-msg"
          rows={4}
          required
          minLength={10}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-accentLight text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Questions about the TF-IDF active learning pipeline, Prophet forecaster, or custom bank SMS formats..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-full bg-primary text-white font-bold text-sm hover:bg-primaryDark transition shadow-pinkSm"
      >
        {loading ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
