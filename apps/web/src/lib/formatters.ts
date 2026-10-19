export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export function formatINR(amount: number, showDecimals = false): string {
  const num = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);
}

export const CATEGORY_COLORS: Record<string, string> = {
  "Housing & Rent": "#D81B60",
  "Food & Dining": "#EC407A",
  "Shopping & E-Commerce": "#AB47BC",
  "Groceries & Supermarkets": "#26A69A",
  "Transport & Fuel": "#42A5F5",
  "Bills & Utilities": "#FFA726",
  "Subscriptions & OTT": "#7E57C2",
  "Health & Fitness": "#66BB6A",
  "Entertainment & Leisure": "#EF5350",
  "Income & Transfers": "#2E7D32",
};
