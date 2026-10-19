"""Database seeding for 1-Click Instant Demo user and pre-populated transactions."""
import json
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import CategoryBudget, MerchantCorrection, ModelTrainingRun, Transaction, User
from app.ml.classifier import categorizer
from app.ml.parser import normalize_merchant_name
from app.ml.rules import evaluate_transactions_rules
from app.services.synthetic import generate_curated_three_month_dataset

DEMO_EMAIL = "demo@paisapulse.ai"

DEFAULT_BUDGETS = {
    "Housing & Rent": 20000.0,
    "Food & Dining": 6500.0,
    "Groceries & Supermarkets": 6000.0,
    "Shopping & E-Commerce": 8000.0,
    "Transport & Fuel": 4500.0,
    "Bills & Utilities": 3500.0,
    "Subscriptions & OTT": 3000.0,
    "Health & Fitness": 3000.0,
    "Entertainment & Leisure": 3000.0,
}


def ensure_demo_data(db: Session) -> User:
    """Create or return the pre-seeded Demo User with 3 months of categorized transactions."""
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if not user:
        user = User(
            email=DEMO_EMAIL,
            name="Aarav Mehta (Demo Account)",
            password_hash=hash_password("PaisaPulseDemo#2026"),
            role="member",
            monthly_income_target=85000.0,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    tx_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
    if tx_count == 0:
        seed_user_portfolio(db, user)

    return user


def seed_user_portfolio(db: Session, user: User) -> int:
    """Populate a user account with default budgets, sample corrections, and 3-month transactions."""
    # 1. Seed default budgets if none exist
    existing_budgets = db.query(CategoryBudget).filter(CategoryBudget.user_id == user.id).count()
    if existing_budgets == 0:
        for cat, limit_val in DEFAULT_BUDGETS.items():
            db.add(
                CategoryBudget(
                    user_id=user.id,
                    category=cat,
                    monthly_limit=limit_val,
                    alert_threshold_pct=80.0,
                )
            )
        db.commit()

    # 2. Seed two sample human-in-the-loop merchant corrections
    existing_corr = db.query(MerchantCorrection).filter(MerchantCorrection.user_id == user.id).count()
    if existing_corr == 0:
        sample_corrections = [
            ("ZEPTO CAFE SNACK ORDER", "ZEPTO CAFE", "Food & Dining", "Groceries & Supermarkets"),
            ("CULT.FIT CUREFIT GYM MEMBERSHIP", "CULT.FIT CUREFIT GYM", "Health & Fitness", "Subscriptions & OTT"),
        ]
        for raw_m, norm_m, corr_cat, prev_cat in sample_corrections:
            db.add(
                MerchantCorrection(
                    user_id=user.id,
                    raw_merchant=raw_m,
                    normalized_merchant=norm_m,
                    corrected_category=corr_cat,
                    previous_category=prev_cat,
                    times_applied=3,
                )
            )
        db.commit()

    # Retrain model with user corrections and log training run
    corr_rows = db.query(MerchantCorrection).filter(MerchantCorrection.user_id == user.id).all()
    corr_pairs = [(c.raw_merchant, c.corrected_category) for c in corr_rows]
    user_override_map = {c.normalized_merchant: c.corrected_category for c in corr_rows}
    metrics = categorizer.train(user_corrections=corr_pairs)

    db.add(
        ModelTrainingRun(
            user_id=user.id,
            trigger_source="initial_seed",
            training_samples=metrics["training_samples"],
            user_corrections_count=metrics["user_corrections_count"],
            cv_accuracy=metrics["cv_accuracy"],
            cv_macro_f1=metrics["cv_macro_f1"],
            duration_ms=metrics["last_train_ms"],
        )
    )
    db.commit()

    # 3. Generate and classify 3-month synthetic dataset
    raw_records = generate_curated_three_month_dataset()
    enriched: list[dict] = []

    for rec in raw_records:
        norm_m = normalize_merchant_name(rec["merchant"])
        pred = categorizer.predict(
            merchant=rec["merchant"],
            raw_text=rec["raw_text"],
            tx_type=rec["tx_type"],
            user_overrides=user_override_map,
        )
        enriched.append(
            {
                **rec,
                "normalized_merchant": norm_m,
                "category": pred["category"],
                "predicted_category": pred["category"],
                "confidence": pred["confidence"],
                "top_tokens": pred["top_tokens"],
                "user_corrected": norm_m in user_override_map,
            }
        )

    # 4. Run rules engine for recurring + anomaly detection
    annotated, _recurring, _anomalies = evaluate_transactions_rules(enriched)

    for item in annotated:
        db.add(
            Transaction(
                user_id=user.id,
                tx_date=item["tx_date"],
                raw_text=item["raw_text"],
                merchant=item["merchant"],
                normalized_merchant=item["normalized_merchant"],
                amount=item["amount"],
                tx_type=item["tx_type"],
                channel=item["channel"],
                reference_id=item.get("reference_id"),
                category=item["category"],
                predicted_category=item["predicted_category"],
                confidence=item["confidence"],
                top_tokens_json=json.dumps(item.get("top_tokens", [])),
                user_corrected=bool(item.get("user_corrected", False)),
                is_recurring=bool(item.get("is_recurring", False)),
                recurring_interval_days=item.get("recurring_interval_days"),
                is_anomaly=bool(item.get("is_anomaly", False)),
                anomaly_score=float(item.get("anomaly_score", 0.0)),
                anomaly_reason=item.get("anomaly_reason"),
            )
        )
    db.commit()
    return len(annotated)
