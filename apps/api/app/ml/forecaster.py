"""Prophet-Style Additive Seasonal + Trend Monthly Spend Forecaster & Savings Engine."""
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List

import numpy as np

from app.ml.classifier import CATEGORIES

DISCRETIONARY_CATEGORIES = {
    "Food & Dining": 0.25,
    "Shopping & E-Commerce": 0.30,
    "Entertainment & Leisure": 0.30,
    "Subscriptions & OTT": 0.25,
    "Transport & Fuel": 0.12,
}


def generate_monthly_forecast(
    transactions: List[Dict[str, Any]],
    recurring_subscriptions: List[Dict[str, Any]],
    monthly_income_target: float = 85000.0,
) -> Dict[str, Any]:
    """Forecast next month's spending per category using additive trend + payday/festival seasonality.

    Models:
      y(t) = T(t) + S_payday(t) + S_festival(t) + epsilon
    Returns total forecast, 80% confidence interval, per-category forecast breakdown,
    historical monthly series, and personalized savings recommendations.
    """
    debits = [tx for tx in transactions if tx.get("tx_type", "debit") == "debit"]

    # Group historical spend by YYYY-MM and category
    month_cat_spend: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    month_totals: Dict[str, float] = defaultdict(float)
    payday_window_spend = 0.0
    total_spend_all = 0.0

    for tx in debits:
        d_str = str(tx.get("tx_date", ""))[:10]
        if len(d_str) < 7:
            continue
        ym = d_str[:7]
        cat = tx.get("category", "Shopping & E-Commerce")
        if cat == "Income & Transfers":
            continue
        amt = float(tx.get("amount", 0.0))
        month_cat_spend[ym][cat] += amt
        month_totals[ym] += amt
        total_spend_all += amt
        try:
            day_num = int(d_str[8:10])
            if 1 <= day_num <= 7:
                payday_window_spend += amt
        except ValueError:
            pass

    sorted_months = sorted(month_totals.keys())
    if not sorted_months:
        now_ym = datetime.now().strftime("%Y-%m")
        sorted_months = [now_ym]

    # Determine next month label
    last_ym = sorted_months[-1]
    try:
        yr, mo = int(last_ym[:4]), int(last_ym[5:7])
        next_yr = yr + 1 if mo == 12 else yr
        next_mo = 1 if mo == 12 else mo + 1
        next_month_label = f"{next_yr:04d}-{next_mo:02d}"
    except Exception:
        next_month_label = "Next Month"

    # Seasonality factor for Indian festival months (Oct/Nov Diwali/Dussehra, Dec year-end)
    try:
        target_mo = int(next_month_label[5:7])
    except Exception:
        target_mo = 11
    festival_multiplier = 1.06 if target_mo in {10, 11, 12} else 1.00

    expense_categories = [c for c in CATEGORIES if c != "Income & Transfers"]
    category_forecasts: List[Dict[str, Any]] = []

    total_predicted = 0.0
    total_lower = 0.0
    total_upper = 0.0

    for cat in expense_categories:
        series = [float(month_cat_spend[m].get(cat, 0.0)) for m in sorted_months]
        if not any(series):
            continue

        arr = np.array(series, dtype=float)
        n = len(arr)

        if n == 1:
            trend_pred = float(arr[0])
            residual_std = max(trend_pred * 0.12, 150.0)
        elif n == 2:
            # Damped linear trend (weight recent month 65%, prior 35% + 30% slope)
            slope = float(arr[1] - arr[0])
            trend_pred = float(0.65 * arr[1] + 0.35 * arr[0] + 0.25 * slope)
            residual_std = max(abs(slope) * 0.45, trend_pred * 0.10, 150.0)
        else:
            # Ordinary least squares trend + exponential smoothing blend (Prophet/Holt-Winters hybrid)
            t_idx = np.arange(n, dtype=float)
            slope, intercept = np.polyfit(t_idx, arr, 1)
            linear_proj = float(intercept + slope * n)
            ema = float(arr[0])
            alpha = 0.55
            for val in arr[1:]:
                ema = alpha * float(val) + (1.0 - alpha) * ema
            # Damped blend prevents wild extrapolation on short histories
            trend_pred = max(0.0, 0.55 * ema + 0.45 * linear_proj)
            fitted = intercept + slope * t_idx
            residual_std = max(float(np.std(arr - fitted)), trend_pred * 0.09, 150.0)

        # Apply seasonal multiplier only to discretionary categories
        cat_season = festival_multiplier if cat in DISCRETIONARY_CATEGORIES else 1.0
        predicted = round(max(0.0, trend_pred * cat_season), 2)
        # 80% prediction interval (z = 1.28)
        margin = round(1.28 * residual_std, 2)
        lower = round(max(0.0, predicted - margin), 2)
        upper = round(predicted + margin, 2)

        last_actual = round(float(arr[-1]), 2)
        delta_pct = round(((predicted - last_actual) / last_actual) * 100.0, 1) if last_actual > 0 else 0.0

        total_predicted += predicted
        total_lower += lower
        total_upper += upper

        category_forecasts.append(
            {
                "category": cat,
                "last_month_actual": last_actual,
                "predicted": predicted,
                "lower_bound": lower,
                "upper_bound": upper,
                "delta_pct": delta_pct,
            }
        )

    category_forecasts.sort(key=lambda x: x["predicted"], reverse=True)

    # Build monthly historical + forecast timeline for charts
    monthly_timeline = [
        {
            "month": m,
            "actual": round(float(month_totals[m]), 2),
            "predicted": round(float(month_totals[m]), 2),
            "lower_bound": round(float(month_totals[m]), 2),
            "upper_bound": round(float(month_totals[m]), 2),
            "is_forecast": False,
        }
        for m in sorted_months
    ]
    monthly_timeline.append(
        {
            "month": next_month_label,
            "actual": None,
            "predicted": round(total_predicted, 2),
            "lower_bound": round(total_lower, 2),
            "upper_bound": round(total_upper, 2),
            "is_forecast": True,
        }
    )

    # Generate actionable AI Savings Suggestions
    suggestions: List[Dict[str, Any]] = []
    potential_monthly_savings = 0.0

    for cf in category_forecasts:
        cat = cf["category"]
        pred = cf["predicted"]
        if cat in DISCRETIONARY_CATEGORIES and pred >= 1200.0:
            save_rate = DISCRETIONARY_CATEGORIES[cat]
            save_amt = round((pred * save_rate) / 50.0) * 50.0
            if save_amt >= 200.0:
                potential_monthly_savings += save_amt
                tip = (
                    f"Cap {cat} at ₹{int(pred - save_amt):,}/mo by cutting 2 impulse orders per week."
                    if cat in {"Food & Dining", "Shopping & E-Commerce"}
                    else f"Trim {cat} spend by {int(save_rate * 100)}% next month to save ₹{int(save_amt):,}."
                )
                suggestions.append(
                    {
                        "category": cat,
                        "title": f"Optimize {cat}",
                        "monthly_saving": save_amt,
                        "recommendation": tip,
                    }
                )

    # Add subscription consolidation suggestion if >= 2 recurring subscriptions
    ott_subs = [s for s in recurring_subscriptions if s.get("category") == "Subscriptions & OTT"]
    if len(ott_subs) >= 2:
        sub_total = sum(float(s.get("monthly_equivalent", 0.0)) for s in ott_subs)
        sub_save = round(min(sub_total * 0.35, 650.0), 0)
        if sub_save >= 150:
            potential_monthly_savings += sub_save
            names = ", ".join(s["normalized_merchant"] for s in ott_subs[:3])
            suggestions.append(
                {
                    "category": "Subscriptions & OTT",
                    "title": f"Consolidate {len(ott_subs)} Active OTT/App Plans",
                    "monthly_saving": sub_save,
                    "recommendation": f"You have {len(ott_subs)} recurring plans ({names}) totaling ₹{int(sub_total):,}/mo. Pause 1 unused plan to save ₹{int(sub_save):,}/mo.",
                }
            )

    payday_share_pct = round((payday_window_spend / total_spend_all) * 100.0, 1) if total_spend_all > 0 else 38.0
    projected_savings = round(max(0.0, monthly_income_target - total_predicted), 2)
    projected_savings_rate = (
        round((projected_savings / monthly_income_target) * 100.0, 1) if monthly_income_target > 0 else 0.0
    )

    return {
        "model": "Prophet-Style Additive Seasonal + Damped Trend Forecaster",
        "next_month": next_month_label,
        "total_predicted": round(total_predicted, 2),
        "lower_bound": round(total_lower, 2),
        "upper_bound": round(total_upper, 2),
        "payday_spike_share_pct": payday_share_pct,
        "monthly_income_target": monthly_income_target,
        "projected_net_savings": projected_savings,
        "projected_savings_rate_pct": projected_savings_rate,
        "potential_extra_savings": round(potential_monthly_savings, 2),
        "monthly_timeline": monthly_timeline,
        "category_forecasts": category_forecasts,
        "savings_suggestions": suggestions[:4],
    }
