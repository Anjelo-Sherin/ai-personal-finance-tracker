import { API_URL } from "./formatters";

const TOKEN_STORAGE_KEY = "paisapulse_access_token";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  monthly_income_target: number;
  telegram_chat_id?: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  tx_date: string;
  raw_text: string;
  merchant: string;
  normalized_merchant: string;
  amount: number;
  tx_type: "debit" | "credit";
  channel: string;
  reference_id?: string | null;
  category: string;
  predicted_category: string;
  confidence: number;
  top_tokens: string[];
  user_corrected: boolean;
  is_recurring: boolean;
  recurring_interval_days?: number | null;
  is_anomaly: boolean;
  anomaly_score: number;
  anomaly_reason?: string | null;
  notes?: string | null;
  created_at?: string | null;
}

export interface RecurringSubscription {
  merchant: string;
  normalized_merchant: string;
  category: string;
  cadence: string;
  interval_days: number;
  average_amount: number;
  latest_amount: number;
  monthly_equivalent: number;
  occurrences: number;
  last_charged_date: string;
  next_expected_date: string;
  price_hike_pct: number;
}

export interface AnomalyItem {
  id: string;
  tx_date: string;
  merchant: string;
  normalized_merchant: string;
  category: string;
  amount: number;
  anomaly_score: number;
  anomaly_reason: string;
}

export interface BudgetStatusItem {
  id: string;
  category: string;
  monthly_limit: number;
  spent_active_month: number;
  utilization_pct: number;
  alert_threshold_pct: number;
  status: "healthy" | "warning" | "exceeded";
}

export interface CategoryForecastItem {
  category: string;
  last_month_actual: number;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  delta_pct: number;
}

export interface MonthlyTimelinePoint {
  month: string;
  actual: number | null;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
  is_forecast: boolean;
}

export interface SavingsSuggestion {
  category: string;
  title: string;
  monthly_saving: number;
  recommendation: string;
}

export interface DashboardPayload {
  summary: {
    active_month: string;
    total_debit: number;
    total_credit: number;
    active_month_debit: number;
    transaction_count: number;
    recurring_count: number;
    recurring_monthly_total: number;
    anomaly_count: number;
    user_corrections_count: number;
    cv_accuracy_pct: number;
    cv_macro_f1_pct: number;
    last_train_ms: number;
    category_breakdown: {
      category: string;
      amount: number;
      active_month_amount: number;
      share_pct: number;
      count: number;
    }[];
  };
  categories: string[];
  budgets: BudgetStatusItem[];
  budget_alerts: BudgetStatusItem[];
  recurring_subscriptions: RecurringSubscription[];
  anomalies: AnomalyItem[];
  forecast: {
    model: string;
    next_month: string;
    total_predicted: number;
    lower_bound: number;
    upper_bound: number;
    payday_spike_share_pct: number;
    monthly_income_target: number;
    projected_net_savings: number;
    projected_savings_rate_pct: number;
    potential_extra_savings: number;
    monthly_timeline: MonthlyTimelinePoint[];
    category_forecasts: CategoryForecastItem[];
    savings_suggestions: SavingsSuggestion[];
  };
  model_metrics: {
    model_type: string;
    categories: string[];
    training_samples: number;
    user_corrections_count: number;
    cv_accuracy: number;
    cv_macro_f1: number;
    last_train_ms: number;
  };
  corrections: {
    id: string;
    raw_merchant: string;
    normalized_merchant: string;
    corrected_category: string;
    previous_category: string;
    times_applied: number;
    created_at: string;
  }[];
  recent_transactions: TransactionItem[];
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.message) {
        errMsg = errJson.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}
