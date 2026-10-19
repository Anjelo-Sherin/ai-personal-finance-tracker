"""Automated pytest suite for PaisaPulse API, NLP Categorizer, Active Learning, Rules Engine, and Forecaster."""
import io
from fastapi.testclient import TestClient

from app.main import app


def test_health_and_public_sms_parser():
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        # Test noisy Indian UPI/SMS parsing + TF-IDF categorization
        sample_sms = "\n".join(
            [
                "Rs. 485.00 debited via UPI to SWIGGY*ORDER 8812 on 14-10-2026 Ref 628910421.",
                "Alert: INR 649.00 spent on HDFC Card XX1234 at POS 4111XXXXXXXX1234 NETFLIX.COM on 10-10-2026.",
                "Your A/c XX4821 debited for Rs. 1,480.00 towards ACH D- BESCOM ELECTRICITY BILL BLR on 05-10-2026.",
            ]
        )
        preview = client.post("/api/v1/finance/parse-preview", json={"text": sample_sms})
        assert preview.status_code == 200
        data = preview.json()
        assert data["count"] == 3
        items = data["items"]

        assert items[0]["amount"] == 485.0
        assert items[0]["tx_date"] == "2026-10-14"
        assert "SWIGGY" in items[0]["normalized_merchant"]
        assert items[0]["category"] == "Food & Dining"

        assert items[1]["amount"] == 649.0
        assert items[1]["category"] == "Subscriptions & OTT"

        assert items[2]["amount"] == 1480.0
        assert items[2]["category"] == "Bills & Utilities"


def test_demo_login_and_dashboard_analytics():
    with TestClient(app) as client:
        demo_res = client.post("/api/v1/auth/demo")
        assert demo_res.status_code == 200
        token = demo_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        dash_res = client.get("/api/v1/finance/dashboard", headers=headers)
        assert dash_res.status_code == 200
        dash = dash_res.json()

        assert dash["summary"]["transaction_count"] >= 40
        assert dash["summary"]["recurring_count"] >= 4
        assert dash["summary"]["anomaly_count"] >= 2
        assert dash["summary"]["cv_accuracy_pct"] >= 85.0

        forecast = dash["forecast"]
        assert forecast["total_predicted"] > 0
        assert forecast["lower_bound"] <= forecast["total_predicted"] <= forecast["upper_bound"]
        assert len(forecast["category_forecasts"]) >= 5
        assert len(forecast["savings_suggestions"]) >= 1


def test_active_learning_correction_and_retraining():
    with TestClient(app) as client:
        demo_res = client.post("/api/v1/auth/demo")
        token = demo_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Ingest a noisy custom merchant string
        ingest_res = client.post(
            "/api/v1/finance/ingest-sms",
            headers=headers,
            json={"text": "Rs. 540.00 debited via UPI to BLR ARTISAN ROASTERY*9912 on 18-10-2026 Ref 88192011."},
        )
        assert ingest_res.status_code == 201
        tx = ingest_res.json()["transactions"][0]
        tx_id = tx["id"]

        # Correct its category to Food & Dining via Human-in-the-Loop Active Learning
        patch_res = client.patch(
            f"/api/v1/finance/transactions/{tx_id}/category",
            headers=headers,
            json={"category": "Food & Dining", "apply_to_similar": True},
        )
        assert patch_res.status_code == 200
        patched = patch_res.json()
        assert patched["transaction"]["category"] == "Food & Dining"
        assert patched["transaction"]["user_corrected"] is True
        assert patched["model_metrics"]["user_corrections_count"] >= 1

        # Verify a subsequent transaction from the same noisy merchant is automatically classified as Food & Dining with high confidence
        verify_res = client.post(
            "/api/v1/finance/parse-preview",
            json={"text": "Rs. 320.00 paid to BLR ARTISAN ROASTERY*4410 on 19-10-2026."},
        )
        assert verify_res.status_code == 200
        pred_item = verify_res.json()["items"][0]
        assert pred_item["category"] == "Food & Dining"
        assert pred_item["confidence"] >= 0.95


def test_csv_upload_and_exports():
    with TestClient(app) as client:
        demo_res = client.post("/api/v1/auth/demo")
        token = demo_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        csv_content = (
            "Date,Description,Amount,Type\n"
            "2026-10-17,UPI/9918271/DR/APOLLO PHARMACY BLR,640.00,Debit\n"
            "2026-10-18,POS 4111XXXX1234 UBER INDIA SYSTEMS,295.00,Debit\n"
        ).encode("utf-8")

        up_res = client.post(
            "/api/v1/finance/upload-csv",
            headers=headers,
            files={"file": ("statement.csv", io.BytesIO(csv_content), "text/csv")},
        )
        assert up_res.status_code == 201
        assert up_res.json()["ingested_count"] == 2

        # Verify CSV & PDF export
        csv_exp = client.get("/api/v1/finance/export.csv", headers=headers)
        assert csv_exp.status_code == 200
        assert "normalized_merchant" in csv_exp.text

        pdf_exp = client.get("/api/v1/finance/report.pdf", headers=headers)
        assert pdf_exp.status_code == 200
        assert pdf_exp.content.startswith(b"%PDF-1.4")

        # Verify Telegram Alert Preview
        tg_res = client.post("/api/v1/finance/alerts/telegram-test", headers=headers, json={})
        assert tg_res.status_code == 200
        assert "PaisaPulse AI Finance Alert" in tg_res.json()["message_preview"]


def test_row_level_user_isolation():
    with TestClient(app) as client:
        # User A (demo user)
        demo_a = client.post("/api/v1/auth/demo").json()
        headers_a = {"Authorization": f"Bearer {demo_a['access_token']}"}
        txs_a = client.get("/api/v1/finance/transactions", headers=headers_a).json()["transactions"]
        target_tx_id = txs_a[0]["id"]

        # Create User B
        signup_b = client.post(
            "/api/v1/auth/signup",
            json={
                "name": "Priya Nair",
                "email": "priya.isolation.test@paisapulse.ai",
                "password": "StrongPassword#2026",
            },
        )
        assert signup_b.status_code in (201, 400)
        if signup_b.status_code == 400:
            login_b = client.post(
                "/api/v1/auth/login",
                json={"email": "priya.isolation.test@paisapulse.ai", "password": "StrongPassword#2026"},
            ).json()
            token_b = login_b["access_token"]
        else:
            token_b = signup_b.json()["access_token"]

        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B must not be able to modify or delete User A's transaction
        forbidden_patch = client.patch(
            f"/api/v1/finance/transactions/{target_tx_id}/category",
            headers=headers_b,
            json={"category": "Food & Dining", "apply_to_similar": False},
        )
        assert forbidden_patch.status_code == 404

        forbidden_del = client.delete(f"/api/v1/finance/transactions/{target_tx_id}", headers=headers_b)
        assert forbidden_del.status_code == 404
