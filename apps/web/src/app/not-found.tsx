import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <span className="inline-block px-3 py-1 rounded-full bg-soft text-primaryDark text-xs font-bold">
        404 · Page Not Found
      </span>
      <h1 className="text-3xl font-extrabold text-ink">
        Looks like this transaction didn&apos;t clear.
      </h1>
      <p className="text-sm text-muted">
        The page you requested doesn&apos;t exist. Head back to the PaisaPulse home page or open
        your AI Finance Dashboard.
      </p>
      <div className="pt-2 flex justify-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-bold hover:bg-primaryDark transition"
        >
          Back to Home
        </Link>
        <Link
          href="/app"
          className="px-5 py-2.5 rounded-full bg-white border border-accentLight text-ink text-sm font-bold hover:bg-soft transition"
        >
          Open Dashboard
        </Link>
      </div>
    </div>
  );
}
