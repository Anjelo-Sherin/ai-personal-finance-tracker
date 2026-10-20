"""Comprehensive end-to-end live testing script for PaisaPulse."""
import io
import json
import time
from fastapi.testclient import TestClient

from app.main import app

def run_e2e_tests():
    print("=" * 60)
    print("🚀 STARTING PAISAPULSE END-TO-END VERIFICATION")
    print("=" * 60)

    client = TestClient(app)

    # 1. Health check
    print("\n[1/8] Testing /health endpoint...")
    t0 = time.perf_counter()
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"  ✓ API Health OK ({round((time.perf_counter() - t0)*1000, 2)} ms) -> {res.json()}")

    # 2. Noisy Indian UPI / SMS Parsing & Classification
    print("\n[2/8] Testing Noisy Indian UPI / Bank SMS Regex & TF-IDF Categorizer...")
    test_cases = [
        ("Rs. 485.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421", "Food & Dining", "SWIGGY"),
        ("Alert: INR 649.00 spent on Card XX1234 at POS 4111XXXXXXXX1234 NETFLIX.COM on 18-10-2026", "Subscriptions & OTT", "NETFLIX.COM"),
        ("INR 1,480.00 debited towards ACH D- BESCOM ELECTRICITY BILL BLR on 15-10-2026", "Bills & Utilities", "BESCOM ELECTRICITY BILL"),
        ("Rs. 1,850.00 debited via UPI to BLINKIT*INSTANT GROCERY 4410 on 17-10-2026", "Groceries & Supermarkets", "BLINKIT"),
        ("Rs. 320.00 paid to UBER INDIA SYSTEMS TRIP 7712 on 16-10-2026 via UPI", "Transport & Fuel", "UBER INDIA SYSTEMS TRIP"),
        ("INR 85,000.00 credited to your A/c XX4821 via NEFT-CR-SALARY-ACME CORP on 01-10-2026", "Income & Transfers", "NEFT CR SALARY ACME CORP"),
    ]

    for raw_sms, expected_cat, expected_merchant_substr in test_cases:
        res = client.post("/api/v1/finance/parse-preview", json={"text": raw_sms})
        assert res.status_code == 200, f"Parse failed: {res.text}"
        data = res.json()
        item = data["items"][0]
        assert item["amount"] > 0, f"Amount extraction failed for: {raw_sms}"
        assert item["category"] == expected_cat, f"Expected {expected_cat}, got {item['category']} for: {raw_sms}"
        print(f"  ✓ '{item['normalized_merchant']}' ({item['channel']}) -> ₹{item['amount']} -> {item['category']} (conf: {round(item['confidence']*100, 1)}%, top tokens: {item['top_tokens'][:2]})")

    # 3. Demo User Auth & Portfolio Ingestion
    print("\n[3/8] Testing 1-Click Instant Demo Login & Database Seeding...")
    demo_res = client.post("/api/v1/auth/demo")
    assert demo_res.status_code == 200, f"Demo login failed: {demo_res.text}"
    token = demo_res.json()["access_token"]
    user = demo_res.json()["user"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"  ✓ Authenticated as: {user['name']} ({user['email']})")

    # 4. Dashboard Analytics & KPIs
    print("\n[4/8] Testing Dashboard Analytics, Rules Engine & Forecasting...")
    dash_res = client.get("/api/v1/finance/dashboard", headers=headers)
    assert dash_res.status_code == 200, f"Dashboard failed: {dash_res.text}"
    dash = dash_res.json()
    summary = dash["summary"]
    forecast = dash["forecast"]
    recurring = dash["recurring_subscriptions"]
    anomalies = dash["anomalies"]

    print(f"  ✓ Total Analysed Spend: ₹{summary['total_debit']:,.2f} across {summary['transaction_count']} transactions")
    print(f"  ✓ Active Month ({summary['active_month']}) Spend: ₹{summary['active_month_debit']:,.2f}")
    print(f"  ✓ Recurring Subscriptions: {len(recurring)} active (₹{summary['recurring_monthly_total']:,.2f}/mo)")
    for sub in recurring[:3]:
        hike_str = f" [Price hike: +{sub['price_hike_pct']}%!]" if sub['price_hike_pct'] > 0 else ""
        print(f"    - {sub['normalized_merchant']} ({sub['cadence']}): ₹{sub['latest_amount']} | next: {sub['next_expected_date']}{hike_str}")

    print(f"  ✓ Spend Anomalies Flagged: {len(anomalies)}")
    for anom in anomalies[:2]:
        print(f"    - {anom['tx_date']} | {anom['normalized_merchant']}: ₹{anom['amount']} ({anom['anomaly_reason']})")

    print(f"  ✓ Prophet Forecast ({forecast['next_month']}): ₹{forecast['total_predicted']:,.2f} (80% CI: ₹{forecast['lower_bound']:,.2f} – ₹{forecast['upper_bound']:,.2f})")
    print(f"  ✓ Payday Spike Share (Days 1-7): {forecast['payday_spike_share_pct']}% of monthly spend")
    print(f"  ✓ AI Savings Potential: ₹{forecast['potential_extra_savings']:,.2f}/mo")
    for sug in forecast["savings_suggestions"][:2]:
        print(f"    - {sug['title']}: {sug['recommendation']}")

    # 5. Human-in-the-Loop Active Learning Retraining
    print("\n[5/8] Testing Human-in-the-Loop Active Learning Retraining (< 25 ms)...")
    # Ingest a brand new unknown coffee roastery
    custom_sms = "Rs. 450.00 debited via UPI to INDIRANAGAR ARTISAN BREWS on 19-10-2026 Ref 991827"
    ingest = client.post("/api/v1/finance/ingest-sms", headers=headers, json={"text": custom_sms})
    assert ingest.status_code == 201
    new_tx = ingest.json()["transactions"][0]
    tx_id = new_tx["id"]
    print(f"  ✓ Ingested new transaction: {new_tx['merchant']} (Initial category: {new_tx['category']})")

    # Correct category to Food & Dining
    t_retrain_start = time.perf_counter()
    patch = client.patch(
        f"/api/v1/finance/transactions/{tx_id}/category",
        headers=headers,
        json={"category": "Food & Dining", "apply_to_similar": True},
    )
    assert patch.status_code == 200, f"Active learning patch failed: {patch.text}"
    retrain_res = patch.json()
    retrain_duration_ms = round((time.perf_counter() - t_retrain_start) * 1000, 2)
    metrics = retrain_res["model_metrics"]
    print(f"  ✓ Active learning model retrained in {retrain_duration_ms} ms (Internal model fit: {metrics['last_train_ms']} ms)")
    print(f"  ✓ New 5-Fold Stratified CV Accuracy: {round(metrics['cv_accuracy']*100, 1)}% (Macro-F1: {round(metrics['cv_macro_f1']*100, 1)}%)")
    print(f"  ✓ Corrections stored: {metrics['user_corrections_count']}")

    # Subsequent prediction on same merchant variant must be Food & Dining with >=95% confidence
    verify_pred = client.post(
        "/api/v1/finance/parse-preview",
        json={"text": "Rs. 520.00 paid to INDIRANAGAR ARTISAN BREWS*8821 on 20-10-2026."},
    )
    assert verify_pred.status_code == 200
    v_item = verify_pred.json()["items"][0]
    assert v_item["category"] == "Food & Dining"
    assert v_item["confidence"] >= 0.95
    print(f"  ✓ Subsequent prediction correctly labeled as '{v_item['category']}' with {round(v_item['confidence']*100, 1)}% confidence!")

    # 6. Bank Statement CSV Upload
    print("\n[6/8] Testing Bank Statement CSV Upload...")
    csv_data = (
        "Date,Description,Amount,Type\n"
        "2026-10-18,UPI/99128/DR/ZEPTO KIRANA KART,420.00,Debit\n"
        "2026-10-19,POS 4111XXXX4321 APOLLO PHARMACY,650.00,Debit\n"
        "2026-10-19,ACH D- BESCOM POWER BILL,1250.00,Debit\n"
    ).encode("utf-8")

    csv_res = client.post(
        "/api/v1/finance/upload-csv",
        headers=headers,
        files={"file": ("my_statement.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert csv_res.status_code == 201
    print(f"  ✓ CSV statement parsed & classified: {csv_res.json()['ingested_count']} records imported")

    # 7. PDF and CSV Exports
    print("\n[7/8] Testing Single-Page A4 PDF and CSV Report Exports...")
    pdf_res = client.get("/api/v1/finance/report.pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF-1.4")
    print(f"  ✓ A4 PDF report generated successfully ({len(pdf_res.content)} bytes)")

    csv_exp_res = client.get("/api/v1/finance/export.csv", headers=headers)
    assert csv_exp_res.status_code == 200
    assert "normalized_merchant" in csv_exp_res.text
    print(f"  ✓ Categorized CSV report exported ({len(csv_exp_res.text.splitlines())} lines)")

    # 8. Row-Level Security / Isolation Check
    print("\n[8/8] Testing Row-Level User Isolation & Security...")
    # User B attempting to mutate User A's transaction
    b_signup = client.post(
        "/api/v1/auth/signup",
        json={"name": "Attacker", "email": "attacker@example.com", "password": "ComplexPassword123#"},
    )
    token_b = b_signup.json().get("access_token")
    if not token_b:
        b_login = client.post(
            "/api/v1/auth/login",
            json={"email": "attacker@example.com", "password": "ComplexPassword123#"},
        )
        token_b = b_login.json()["access_token"]

    bad_patch = client.patch(
        f"/api/v1/finance/transactions/{tx_id}/category",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"category": "Transport & Fuel"},
    )
    assert bad_patch.status_code == 404, "Security violation: Cross-tenant modification permitted!"
    print(f"  ✓ Row-level security confirmed: Cross-user mutation blocked with HTTP {bad_patch.status_code}")

    print("\n" + "=" * 60)
    print("✅ ALL 8 VERIFICATION PHASES PASSED WITH ZERO ERRORS!")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_tests()
