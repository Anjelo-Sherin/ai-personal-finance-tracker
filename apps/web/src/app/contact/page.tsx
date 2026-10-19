import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/SiteShell";
import { ContactFormClient } from "@/components/ui/ContactFormClient";

export const metadata: Metadata = {
  title: "Contact & Developer Feedback",
  description: "Get in touch with the PaisaPulse team for questions, suggestions, or feedback.",
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Breadcrumbs items={[{ label: "Contact" }]} />

      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-primaryDark bg-soft px-3 py-1 rounded-full">
          Get In Touch
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">
          Contact &amp; Pilot Feedback
        </h1>
        <p className="text-base text-muted leading-relaxed">
          Have ideas for improving the TF-IDF categorizer, expanding bank SMS regex patterns, or testing with your team? Send us a note below.
        </p>
      </div>

      <ContactFormClient />
    </div>
  );
}
