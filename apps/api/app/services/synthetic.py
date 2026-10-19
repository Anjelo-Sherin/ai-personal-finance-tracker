"""Synthetic Indian UPI / SMS & Bank Statement Generator (Faker-style noisy merchant strings)."""
import random
from datetime import date, timedelta
from typing import Any, Dict, List

SYNTHETIC_TEMPLATES = [
    # Food & Dining
    ("SWIGGY*ORDER {ord}", "Food & Dining", (180, 680), "UPI", "Rs. {amt} debited via UPI to SWIGGY*ORDER {ord} on {dt} Ref {ref}. Avl Bal Rs. 42,110."),
    ("UPI/{ref}/DR/ZOMATO MEDIA/HDFC", "Food & Dining", (220, 790), "UPI", "Alert: INR {amt} paid to UPI/{ref}/DR/ZOMATO MEDIA/HDFC on {dt}."),
    ("POS 4111XXXX1234 STARBUCKS COFFEE", "Food & Dining", (310, 640), "POS/Card", "Spent Rs. {amt} at POS 4111XXXX1234 STARBUCKS COFFEE on {dt}."),
    ("DOMINOS PIZZA JUBILANT*{ord}", "Food & Dining", (390, 890), "UPI", "Your A/c XX4821 debited for Rs. {amt} towards DOMINOS PIZZA JUBILANT*{ord} on {dt}."),
    ("EATFIT HEALTHY KITCHEN BLR", "Food & Dining", (190, 420), "UPI", "Rs. {amt} sent to EATFIT HEALTHY KITCHEN BLR via UPI on {dt} Ref {ref}."),
    # Groceries & Supermarkets
    ("BLINKIT*INSTANT GROCERY {ord}", "Groceries & Supermarkets", (340, 1450), "UPI", "Rs. {amt} debited via UPI to BLINKIT*INSTANT GROCERY {ord} on {dt} Ref {ref}."),
    ("BIGBASKET INNOVATIVE RETAIL", "Groceries & Supermarkets", (850, 2400), "UPI", "INR {amt} debited from A/c XX4821 to BIGBASKET INNOVATIVE RETAIL on {dt}."),
    ("ZEPTO KIRANA KART*{ord}", "Groceries & Supermarkets", (260, 980), "UPI", "Paid Rs. {amt} to ZEPTO KIRANA KART*{ord} on {dt} via UPI Ref {ref}."),
    ("POS DMART AVENUE SUPERMARTS", "Groceries & Supermarkets", (1400, 3200), "POS/Card", "Purchase of INR {amt} at POS DMART AVENUE SUPERMARTS on {dt}."),
    # Transport & Fuel
    ("UBER INDIA SYSTEMS TRIP {ord}", "Transport & Fuel", (165, 580), "UPI", "Rs. {amt} paid to UBER INDIA SYSTEMS TRIP {ord} on {dt} via UPI Ref {ref}."),
    ("OLA CABS ANI TECH*{ord}", "Transport & Fuel", (140, 490), "UPI", "INR {amt} debited to OLA CABS ANI TECH*{ord} on {dt}."),
    ("SHELL INDIA PETROL BUNK BLR", "Transport & Fuel", (1200, 2800), "POS/Card", "Spent Rs. {amt} at POS SHELL INDIA PETROL BUNK BLR on {dt}."),
    ("IRCTC RAIL TICKET*{ord}", "Transport & Fuel", (650, 1850), "UPI", "Rs. {amt} debited towards IRCTC RAIL TICKET*{ord} on {dt} Ref {ref}."),
    ("NAMMA YATRI AUTO RIDE", "Transport & Fuel", (85, 240), "UPI", "Rs. {amt} paid to NAMMA YATRI AUTO RIDE on {dt}."),
    # Shopping & E-Commerce
    ("AMAZON PAY INDIA*ORDER {ord}", "Shopping & E-Commerce", (499, 2999), "UPI", "Rs. {amt} debited to AMAZON PAY INDIA*ORDER {ord} on {dt} Ref {ref}."),
    ("FLIPKART INTERNET PVT LTD", "Shopping & E-Commerce", (599, 2499), "UPI", "INR {amt} paid to FLIPKART INTERNET PVT LTD on {dt} via UPI."),
    ("MYNTRA DESIGNS FASHION*{ord}", "Shopping & E-Commerce", (799, 2799), "POS/Card", "Spent Rs. {amt} at MYNTRA DESIGNS FASHION*{ord} on {dt}."),
    ("NYKAA E RETAIL BEAUTY", "Shopping & E-Commerce", (450, 1650), "UPI", "Rs. {amt} debited to NYKAA E RETAIL BEAUTY on {dt} Ref {ref}."),
    # Health & Fitness
    ("APOLLO PHARMACY BLR*{ord}", "Health & Fitness", (240, 950), "UPI", "Rs. {amt} paid to APOLLO PHARMACY BLR*{ord} on {dt}."),
    ("TATA 1MG HEALTHCARE MEDS", "Health & Fitness", (380, 1250), "UPI", "INR {amt} debited towards TATA 1MG HEALTHCARE MEDS on {dt}."),
    # Entertainment & Leisure
    ("BOOKMYSHOW*MOVIE TICKETS {ord}", "Entertainment & Leisure", (450, 1100), "UPI", "Rs. {amt} debited to BOOKMYSHOW*MOVIE TICKETS {ord} on {dt}."),
    ("PVR INOX CINEMAS F&B", "Entertainment & Leisure", (380, 920), "POS/Card", "Spent INR {amt} at POS PVR INOX CINEMAS F&B on {dt}."),
]


def generate_curated_three_month_dataset() -> List[Dict[str, Any]]:
    """Generate a deterministic, rich 3-month dataset (Aug, Sep, Oct 2026) with:
    - Fixed monthly salary credits
    - Monthly recurring subscriptions & utility bills (Netflix, Spotify, ChatGPT Plus, Cult.fit, JioFiber, BESCOM, NoBroker Rent)
    - Daily noisy UPI/POS expenses across all categories
    - 3 clear high-spend anomalies (Croma Electronics ₹18,499, Barbeque Nation Team Dinner ₹5,850, MakeMyTrip Flight ₹11,400)
    """
    rng = random.Random(20261019)
    records: List[Dict[str, Any]] = []

    months = [
        (2026, 8, 31),
        (2026, 9, 30),
        (2026, 10, 19),
    ]

    for yr, mo, max_day in months:
        ym = f"{yr:04d}-{mo:02d}"
        # 1. Salary Credit on 1st of month
        records.append(
            {
                "tx_date": f"{ym}-01",
                "merchant": "NEFT-CR-SALARY-ACME TECHNOLOGIES",
                "amount": 85000.0,
                "tx_type": "credit",
                "channel": "NEFT/IMPS",
                "reference_id": f"NEFT{yr}{mo:02d}0199",
                "raw_text": f"INR 85,000.00 credited to your A/c XX4821 via NEFT-CR-SALARY-ACME TECHNOLOGIES on 01-{mo:02d}-{yr}.",
            }
        )

        # 2. Monthly Rent on 3rd of month
        records.append(
            {
                "tx_date": f"{ym}-03",
                "merchant": "NOBROKER RENT PAY LANDLORD",
                "amount": 18500.0,
                "tx_type": "debit",
                "channel": "UPI",
                "reference_id": f"UPI{yr}{mo:02d}0311",
                "raw_text": f"Rs. 18,500.00 debited via UPI to NOBROKER RENT PAY LANDLORD on 03-{mo:02d}-{yr} Ref UPI{yr}{mo:02d}0311.",
            }
        )

        # 3. Recurring Subscriptions & Utilities
        recurring_Templates = [
            (5, "ACH D- BESCOM ELECTRICITY BILL BLR", 1420.0 + (mo - 8) * 60.0, "ACH/Auto-Debit"),
            (7, "JIOFIBER RELIANCE BROADBAND PLAN", 999.0, "UPI"),
            (10, "POS 4111XXXXXXXX1234 NETFLIX.COM", 649.0, "POS/Card"),
            (12, "OPENAI *CHATGPT PLUS SUBSCRIPTION", 1650.0, "POS/Card"),
            (15, "SPOTIFY INDIA PREMIUM SI MANDATE", 119.0 if mo < 10 else 149.0, "UPI"),  # Price hike in Oct!
            (18, "CULT.FIT CUREFIT GYM MEMBERSHIP", 1499.0, "UPI"),
        ]
        for day_num, merch, amt, chan in recurring_Templates:
            if day_num <= max_day:
                ref = f"{rng.randint(100000000, 999999999)}"
                records.append(
                    {
                        "tx_date": f"{ym}-{day_num:02d}",
                        "merchant": merch,
                        "amount": round(amt, 2),
                        "tx_type": "debit",
                        "channel": chan,
                        "reference_id": ref,
                        "raw_text": f"Rs. {amt:.2f} debited towards {merch} on {day_num:02d}-{mo:02d}-{yr} Ref {ref}.",
                    }
                )

        # 4. Frequent UPI & POS transactions throughout the month
        num_tx = 18 if mo < 10 else 14
        for _ in range(num_tx):
            day_num = rng.randint(2, max_day)
            merch_tpl, _cat, (low_a, high_a), chan, sms_tpl = rng.choice(SYNTHETIC_TEMPLATES)
            ord_id = rng.randint(1000, 9999)
            ref = str(rng.randint(300000000000, 999999999999))
            amt = round(rng.uniform(low_a, high_a) / 5.0) * 5.0
            merch = merch_tpl.format(ord=ord_id, ref=ref[:8])
            dt_human = f"{day_num:02d}-{mo:02d}-{yr}"
            raw_sms = sms_tpl.format(amt=f"{amt:.2f}", ord=ord_id, dt=dt_human, ref=ref)
            records.append(
                {
                    "tx_date": f"{ym}-{day_num:02d}",
                    "merchant": merch,
                    "amount": amt,
                    "tx_type": "debit",
                    "channel": chan,
                    "reference_id": ref,
                    "raw_text": raw_sms,
                }
            )

    # 5. Add 3 unmistakable high-spend anomalies for the Anomaly Engine to highlight
    records.extend(
        [
            {
                "tx_date": "2026-09-24",
                "merchant": "MAKEMYTRIP INDIA FLIGHT BLR-DEL",
                "amount": 11450.0,
                "tx_type": "debit",
                "channel": "POS/Card",
                "reference_id": "MMT99281726",
                "raw_text": "Alert: INR 11,450.00 spent on HDFC Card XX1234 at MAKEMYTRIP INDIA FLIGHT BLR-DEL on 24-09-2026.",
            },
            {
                "tx_date": "2026-10-11",
                "merchant": "CROMA INFINITI RETAIL ELECTRONICS",
                "amount": 18499.0,
                "tx_type": "debit",
                "channel": "POS/Card",
                "reference_id": "CRM88219001",
                "raw_text": "Rs. 18,499.00 spent at POS CROMA INFINITI RETAIL ELECTRONICS on 11-10-2026 Ref CRM88219001.",
            },
            {
                "tx_date": "2026-10-16",
                "merchant": "BARBEQUE NATION HOSPITALITY DINNER",
                "amount": 5850.0,
                "tx_type": "debit",
                "channel": "POS/Card",
                "reference_id": "BBN77123910",
                "raw_text": "INR 5,850.00 debited at POS BARBEQUE NATION HOSPITALITY DINNER on 16-10-2026.",
            },
        ]
    )

    records.sort(key=lambda r: r["tx_date"])
    return records


def generate_random_sms_batch(count: int = 8) -> List[str]:
    """Generate `count` realistic noisy Indian UPI/Bank SMS strings for 1-click live testing."""
    rng = random.Random()
    today = date.today()
    lines: List[str] = []
    chosen = rng.sample(SYNTHETIC_TEMPLATES, k=min(count, len(SYNTHETIC_TEMPLATES)))
    for i, (merch_tpl, _cat, (low_a, high_a), _chan, sms_tpl) in enumerate(chosen):
        dt = (today - timedelta(days=i)).strftime("%d-%m-%Y")
        ord_id = rng.randint(1000, 9999)
        ref = str(rng.randint(400000000000, 999999999999))
        amt = round(rng.uniform(low_a, high_a) / 10.0) * 10.0
        lines.append(sms_tpl.format(amt=f"{amt:.2f}", ord=ord_id, dt=dt, ref=ref))
    return lines
