import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function ThankYouPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-soft text-primary flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-6 h-6" />
      </div>
      <h1 className="text-3xl font-extrabold text-ink">Thank You for Your Feedback!</h1>
      <p className="text-sm text-muted">
        Your message has been received. We review feedback continuously as part of the 30 Projects in 30 Days sprint.
      </p>
      <div className="pt-2">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white text-sm font-bold hover:bg-primaryDark transition shadow-pink"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
