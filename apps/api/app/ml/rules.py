"""Rules Engine: Recurring subscription detection and per-category spend anomaly detection."""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

KNOWN_SUBSCRIPTION_MERCHANTS = {
    "NETFLIX",
    "NETFLIX.COM",
    "SPOTIFY",
    "YOUTUBE",
    "GOOGLE YOUTUBE",
    "AMAZON PRIME",
    "DISNEY",
    "HOTSTAR",
    "JIOCINEMA",
    "SONYLIV",
    "APPLE.COM",
    "APPLE",
    "OPENAI",
    "CHATGPT",
    "GITHUB",
    "NOTION",
    "CANVA",
    "MICROSOFT",
    "ADOBE",
    "CULT.FIT",
    "CULTFIT",
    "ACT FIBERNET",
    "JIOFIBER",
    "AIRTEL",
    "BESCOM",
    "NOBROKER",
    "CRED RENTPAY",
    "MYGATE",
    "COUNTRY DELIGHT",
}


def _parse_iso_date(d_str: str) -> datetime:
    try:
        return datetime.strptime(d_str[:10], "%Y-%m-%d")
    except Exception:
        return datetime.now()


def evaluate_transactions_rules(
    transactions: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Annotate transactions with recurring and anomaly flags and return summaries.

    Returns:
      - annotated_transactions: list of tx dicts updated in-place
      - recurring_subscriptions: list of detected recurring payment objects
      - anomalies: list of flagged anomalous transaction objects
    """
    debits = [tx for tx in transactions if tx.get("tx_type", "debit") == "debit"]

    # 1. Group by normalized_merchant to detect recurring intervals & consistent amounts
    by_merchant: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for tx in debits:
        norm_m = tx.get("normalized_merchant") or "GENERAL MERCHANT"
        by_merchant[norm_m].append(tx)

    recurring_merchants: Dict[str, int] = {}
    recurring_summary: List[Dict[str, Any]] = []

    for norm_m, items in by_merchant.items():
        sorted_items = sorted(items, key=lambda x: x.get("tx_date", ""))
        amounts = [float(x.get("amount", 0.0)) for x in sorted_items]
        mean_amt = float(np.mean(amounts)) if amounts else 0.0
        std_amt = float(np.std(amounts)) if len(amounts) > 1 else 0.0
        cv_amt = std_amt / mean_amt if mean_amt > 0 else 1.0

        is_known_sub = any(k in norm_m for k in KNOWN_SUBSCRIPTION_MERCHANTS) or (
            sorted_items and sorted_items[0].get("category") == "Subscriptions & OTT"
        )

        intervals: List[int] = []
        for i in range(1, len(sorted_items)):
            d1 = _parse_iso_date(sorted_items[i - 1]["tx_date"])
            d2 = _parse_iso_date(sorted_items[i]["tx_date"])
            diff = abs((d2 - d1).days)
            if diff >= 3:
                intervals.append(diff)

        detected_interval: Optional[int] = None
        if intervals:
            median_int = int(round(float(np.median(intervals))))
            if 24 <= median_int <= 36 and cv_amt <= 0.35:
                detected_interval = 30
            elif 6 <= median_int <= 8 and cv_amt <= 0.35:
                detected_interval = 7
            elif is_known_sub and len(sorted_items) >= 2 and cv_amt <= 0.40:
                detected_interval = 30
        elif is_known_sub and len(sorted_items) >= 1 and sorted_items[0].get("category") in {
            "Subscriptions & OTT",
            "Bills & Utilities",
            "Housing & Rent",
        }:
            detected_interval = 30

        if detected_interval is not None:
            recurring_merchants[norm_m] = detected_interval
            last_tx = sorted_items[-1]
            last_dt = _parse_iso_date(last_tx["tx_date"])
            next_dt = (last_dt + timedelta(days=detected_interval)).strftime("%Y-%m-%d")
            monthly_eq = round(mean_amt * (30.0 / detected_interval), 2)

            # Check for recent price hike
            price_hike_pct = 0.0
            if len(amounts) >= 2 and amounts[-2] > 0:
                hike = ((amounts[-1] - amounts[-2]) / amounts[-2]) * 100.0
                if hike >= 5.0:
                    price_hike_pct = round(hike, 1)

            recurring_summary.append(
                {
                    "merchant": last_tx.get("merchant", norm_m),
                    "normalized_merchant": norm_m,
                    "category": last_tx.get("category", "Subscriptions & OTT"),
                    "cadence": "Monthly" if detected_interval >= 25 else "Weekly",
                    "interval_days": detected_interval,
                    "average_amount": round(mean_amt, 2),
                    "latest_amount": round(amounts[-1], 2),
                    "monthly_equivalent": monthly_eq,
                    "occurrences": len(sorted_items),
                    "last_charged_date": last_tx.get("tx_date"),
                    "next_expected_date": next_dt,
                    "price_hike_pct": price_hike_pct,
                }
            )

    # 2. Per-category anomaly detection using robust z-score & median multiplier
    by_category: Dict[str, List[float]] = defaultdict(list)
    for tx in debits:
        cat = tx.get("category", "Shopping & E-Commerce")
        by_category[cat].append(float(tx.get("amount", 0.0)))

    cat_stats: Dict[str, Tuple[float, float, float]] = {}
    for cat, vals in by_category.items():
        arr = np.array(vals, dtype=float)
        median = float(np.median(arr))
        mean = float(np.mean(arr))
        mad = float(np.median(np.abs(arr - median)))
        robust_std = max(float(np.std(arr)), mad * 1.4826, mean * 0.25, 150.0)
        cat_stats[cat] = (mean, robust_std, max(median, 100.0))

    anomalies: List[Dict[str, Any]] = []

    for tx in transactions:
        if tx.get("tx_type", "debit") != "debit":
            tx["is_recurring"] = False
            tx["recurring_interval_days"] = None
            tx["is_anomaly"] = False
            tx["anomaly_score"] = 0.0
            tx["anomaly_reason"] = None
            continue

        norm_m = tx.get("normalized_merchant") or "GENERAL MERCHANT"
        cat = tx.get("category", "Shopping & E-Commerce")
        amt = float(tx.get("amount", 0.0))

        # Apply recurring flag
        if norm_m in recurring_merchants:
            tx["is_recurring"] = True
            tx["recurring_interval_days"] = recurring_merchants[norm_m]
        else:
            tx["is_recurring"] = False
            tx["recurring_interval_days"] = None

        # Apply anomaly flag (skip fixed monthly rent from false-positive anomaly unless huge spike)
        mean, std, median = cat_stats.get(cat, (amt, max(amt * 0.3, 200.0), max(amt, 100.0)))
        z_score = round((amt - mean) / std, 2) if std > 0 else 0.0
        ratio = round(amt / median, 1) if median > 0 else 1.0

        is_anom = False
        reason = None

        if cat != "Housing & Rent" and amt >= 800.0 and (z_score >= 2.0 or (ratio >= 2.8 and amt >= 1500.0)):
            is_anom = True
            reason = f"{ratio}x your typical {cat} spend (z = +{z_score:.1f})"
        elif cat == "Housing & Rent" and z_score >= 2.5 and ratio >= 1.5:
            is_anom = True
            reason = f"Unusually high Housing & Rent charge (+{int((ratio - 1)*100)}% vs median)"

        tx["is_anomaly"] = is_anom
        tx["anomaly_score"] = max(0.0, z_score)
        tx["anomaly_reason"] = reason

        if is_anom:
            anomalies.append(
                {
                    "id": tx.get("id"),
                    "tx_date": tx.get("tx_date"),
                    "merchant": tx.get("merchant"),
                    "normalized_merchant": norm_m,
                    "category": cat,
                    "amount": amt,
                    "anomaly_score": max(0.0, z_score),
                    "anomaly_reason": reason,
                }
            )

    recurring_summary.sort(key=lambda x: x["monthly_equivalent"], reverse=True)
    anomalies.sort(key=lambda x: x["amount"], reverse=True)
    return transactions, recurring_summary, anomalies
