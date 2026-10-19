"""Finance, NLP Parser, Smart Categorizer, Active Learning, Rules Engine, and Forecaster API routes."""
import csv
import io
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import CategoryBudget, MerchantCorrection, ModelTrainingRun, Transaction, User
from app.db.session import get_db
from app.ml.classifier import CATEGORIES, categorizer
from app.ml.forecaster import generate_monthly_forecast
from app.ml.parser import normalize_merchant_name, parse_csv_bytes, parse_sms_batch
from app.ml.rules import evaluate_transactions_rules
from app.routers.auth import get_current_user
from app.services.pdf import build_financial_report_pdf
from app.services.seed import seed_user_portfolio
from app.services.synthetic import generate_random_sms_batch

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])


class ParsePreviewRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=12000)


class IngestSmsRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=25000)


class CategoryCorrectionRequest(BaseModel):
    category: str = Field(..., min_length=2, max_length=64)
    apply_to_similar: bool = True


class BudgetUpdateItem(BaseModel):
    category: str
    monthly_limit: float = Field(..., ge=100.0, le=5000000.0)
    alert_threshold_pct: float = Field(default=80.0, ge=10.0, le=100.0)


class BudgetsUpdateRequest(BaseModel):
    monthly_income_target: Optional[float] = Field(None, ge=1000.0, le=10000000.0)
    budgets: List[BudgetUpdateItem] = []


class SyntheticGenerateRequest(BaseModel):
    mode: str = Field(default="append_batch", pattern="^(append_batch|reset_three_months)$")
    count: int = Field(default=8, ge=1, le=30)


class TelegramTestRequest(BaseModel):
    chat_id: Optional[str] = None


def _tx_to_dict(tx: Transaction) -> Dict[str, Any]:
    try:
        tokens = json.loads(tx.top_tokens_json or "[]")
    except Exception:
        tokens = []
    return {
        "id": tx.id,
        "tx_date": tx.tx_date,
        "raw_text": tx.raw_text,
        "merchant": tx.merchant,
        "normalized_merchant": tx.normalized_merchant,
        "amount": round(float(tx.amount), 2),
        "tx_type": tx.tx_type,
        "channel": tx.channel,
        "reference_id": tx.reference_id,
        "category": tx.category,
        "predicted_category": tx.predicted_category,
        "confidence": round(float(tx.confidence), 3),
        "top_tokens": tokens,
        "user_corrected": bool(tx.user_corrected),
        "is_recurring": bool(tx.is_recurring),
        "recurring_interval_days": tx.recurring_interval_days,
        "is_anomaly": bool(tx.is_anomaly),
        "anomaly_score": round(float(tx.anomaly_score or 0.0), 2),
        "anomaly_reason": tx.anomaly_reason,
        "notes": tx.notes,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    }


def _recompute_user_rules(db: Session, user_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Re-evaluate recurring and anomaly flags across all transactions belonging to `user_id`."""
    rows = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.tx_date.desc(), Transaction.created_at.desc())
        .all()
    )
    tx_dicts = [_tx_to_dict(r) for r in rows]
    annotated, recurring, anomalies = evaluate_transactions_rules(tx_dicts)

    by_id = {r.id: r for r in rows}
    changed = False
    for item in annotated:
        row = by_id.get(item["id"])
        if not row:
            continue
        if (
            row.is_recurring != bool(item["is_recurring"])
            or row.recurring_interval_days != item.get("recurring_interval_days")
            or row.is_anomaly != bool(item["is_anomaly"])
            or round(float(row.anomaly_score or 0.0), 2) != round(float(item.get("anomaly_score", 0.0)), 2)
            or row.anomaly_reason != item.get("anomaly_reason")
        ):
            row.is_recurring = bool(item["is_recurring"])
            row.recurring_interval_days = item.get("recurring_interval_days")
            row.is_anomaly = bool(item["is_anomaly"])
            row.anomaly_score = float(item.get("anomaly_score", 0.0))
            row.anomaly_reason = item.get("anomaly_reason")
            changed = True

    if changed:
        db.commit()

    return annotated, recurring, anomalies


def _build_portfolio_analytics(db: Session, user: User) -> Dict[str, Any]:
    """Compute complete dashboard analytics for the authenticated user."""
    annotated, recurring, anomalies = _recompute_user_rules(db, user.id)

    debits = [t for t in annotated if t["tx_type"] == "debit"]
    credits = [t for t in annotated if t["tx_type"] == "credit"]

    total_debit = round(sum(float(t["amount"]) for t in debits), 2)
    total_credit = round(sum(float(t["amount"]) for t in credits), 2)

    # Current/latest month breakdown for budget comparison
    months_present = sorted({t["tx_date"][:7] for t in debits if len(t["tx_date"]) >= 7})
    active_month = months_present[-1] if months_present else datetime.now().strftime("%Y-%m")

    cat_totals_all: Dict[str, float] = defaultdict(float)
    cat_counts_all: Dict[str, int] = defaultdict(int)
    cat_totals_active_month: Dict[str, float] = defaultdict(float)

    for t in debits:
        cat = t["category"]
        amt = float(t["amount"])
        cat_totals_all[cat] += amt
        cat_counts_all[cat] += 1
        if t["tx_date"].startswith(active_month):
            cat_totals_active_month[cat] += amt

    category_breakdown = []
    for cat, amt in sorted(cat_totals_all.items(), key=lambda x: x[1], reverse=True):
        share = round((amt / total_debit) * 100.0, 1) if total_debit > 0 else 0.0
        category_breakdown.append(
            {
                "category": cat,
                "amount": round(amt, 2),
                "active_month_amount": round(cat_totals_active_month.get(cat, 0.0), 2),
                "share_pct": share,
                "count": cat_counts_all[cat],
            }
        )

    # Budgets vs active month spend
    budget_rows = db.query(CategoryBudget).filter(CategoryBudget.user_id == user.id).all()
    budget_status = []
    budget_alerts = []
    for b in sorted(budget_rows, key=lambda x: x.monthly_limit, reverse=True):
        spent = round(cat_totals_active_month.get(b.category, 0.0), 2)
        pct = round((spent / b.monthly_limit) * 100.0, 1) if b.monthly_limit > 0 else 0.0
        status = "exceeded" if pct >= 100.0 else ("warning" if pct >= b.alert_threshold_pct else "healthy")
        item = {
            "id": b.id,
            "category": b.category,
            "monthly_limit": round(b.monthly_limit, 2),
            "spent_active_month": spent,
            "utilization_pct": pct,
            "alert_threshold_pct": b.alert_threshold_pct,
            "status": status,
        }
        budget_status.append(item)
        if status in {"exceeded", "warning"}:
            budget_alerts.append(item)

    # Prophet-style forecast & savings recommendations
    forecast = generate_monthly_forecast(
        transactions=annotated,
        recurring_subscriptions=recurring,
        monthly_income_target=user.monthly_income_target,
    )

    # Active learning model metrics & user corrections
    corrections = (
        db.query(MerchantCorrection)
        .filter(MerchantCorrection.user_id == user.id)
        .order_by(MerchantCorrection.created_at.desc())
        .all()
    )
    ml_metrics = categorizer.get_metrics()

    summary = {
        "active_month": active_month,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "active_month_debit": round(sum(cat_totals_active_month.values()), 2),
        "transaction_count": len(annotated),
        "recurring_count": len(recurring),
        "recurring_monthly_total": round(sum(float(r["monthly_equivalent"]) for r in recurring), 2),
        "anomaly_count": len(anomalies),
        "user_corrections_count": len(corrections),
        "cv_accuracy_pct": round(ml_metrics["cv_accuracy"] * 100.0, 1),
        "cv_macro_f1_pct": round(ml_metrics["cv_macro_f1"] * 100.0, 1),
        "last_train_ms": ml_metrics["last_train_ms"],
        "category_breakdown": category_breakdown,
    }

    return {
        "summary": summary,
        "categories": CATEGORIES,
        "budgets": budget_status,
        "budget_alerts": budget_alerts,
        "recurring_subscriptions": recurring,
        "anomalies": anomalies,
        "forecast": forecast,
        "model_metrics": ml_metrics,
        "corrections": [
            {
                "id": c.id,
                "raw_merchant": c.raw_merchant,
                "normalized_merchant": c.normalized_merchant,
                "corrected_category": c.corrected_category,
                "previous_category": c.previous_category,
                "times_applied": c.times_applied,
                "created_at": c.created_at.isoformat(),
            }
            for c in corrections
        ],
        "recent_transactions": annotated[:60],
    }


@router.get("/sample-sms")
def get_sample_sms(count: int = Query(default=6, ge=1, le=20)):
    """Return realistic noisy Indian UPI/SMS bank alert lines for 1-click live testing."""
    lines = generate_random_sms_batch(count=count)
    return {"lines": lines, "text": "\n".join(lines)}


@router.post("/parse-preview")
def parse_preview(body: ParsePreviewRequest):
    """Public sandbox endpoint: parse 1 or more raw SMS/UPI lines and run TF-IDF + LR classification."""
    parsed_items = parse_sms_batch(body.text)
    if not parsed_items:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "NO_TRANSACTIONS_FOUND",
                "message": "Could not extract a valid transaction amount from the provided text. Try including 'Rs. 450' or 'INR 1200'.",
            },
        )

    results = []
    for item in parsed_items:
        pred = categorizer.predict(
            merchant=item["merchant"],
            raw_text=item["raw_text"],
            tx_type=item["tx_type"],
        )
        results.append(
            {
                **item,
                "category": pred["category"],
                "confidence": pred["confidence"],
                "source": pred["source"],
                "top_tokens": pred["top_tokens"],
                "probabilities": pred["probabilities"],
            }
        )

    return {
        "count": len(results),
        "items": results,
        "model_metrics": categorizer.get_metrics(),
    }


@router.get("/dashboard")
def get_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return complete financial dashboard, NLP categorization stats, anomalies, recurring bills, and forecast."""
    return _build_portfolio_analytics(db, user)


@router.get("/transactions")
def list_transactions(
    category: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[str] = None,
    only_anomalies: bool = False,
    only_recurring: bool = False,
    limit: int = Query(default=150, ge=1, le=500),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user transactions with optional filtering."""
    q = db.query(Transaction).filter(Transaction.user_id == user.id)
    if category and category != "ALL":
        q = q.filter(Transaction.category == category)
    if month and month != "ALL":
        q = q.filter(Transaction.tx_date.like(f"{month}%"))
    if only_anomalies:
        q = q.filter(Transaction.is_anomaly.is_(True))
    if only_recurring:
        q = q.filter(Transaction.is_recurring.is_(True))
    if search:
        s_term = f"%{search.strip()}%"
        q = q.filter((Transaction.merchant.ilike(s_term)) | (Transaction.raw_text.ilike(s_term)))

    rows = q.order_by(Transaction.tx_date.desc(), Transaction.created_at.desc()).limit(limit).all()
    return {"transactions": [_tx_to_dict(r) for r in rows]}


@router.post("/ingest-sms", status_code=201)
def ingest_sms(
    body: IngestSmsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parse raw SMS/UPI alert text, classify each merchant, run anomaly/recurring rules, and save."""
    parsed_items = parse_sms_batch(body.text)
    if not parsed_items:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "PARSE_EMPTY",
                "message": "No valid transaction amounts found in SMS text. Example: 'Rs. 485 debited to SWIGGY*ORDER 8812 on 19-10-2026'",
            },
        )

    corr_rows = db.query(MerchantCorrection).filter(MerchantCorrection.user_id == user.id).all()
    user_overrides = {c.normalized_merchant: c.corrected_category for c in corr_rows}

    created_rows: List[Transaction] = []
    for item in parsed_items:
        pred = categorizer.predict(
            merchant=item["merchant"],
            raw_text=item["raw_text"],
            tx_type=item["tx_type"],
            user_overrides=user_overrides,
        )
        tx = Transaction(
            user_id=user.id,
            tx_date=item["tx_date"],
            raw_text=item["raw_text"],
            merchant=item["merchant"],
            normalized_merchant=item["normalized_merchant"],
            amount=item["amount"],
            tx_type=item["tx_type"],
            channel=item["channel"],
            reference_id=item.get("reference_id"),
            category=pred["category"],
            predicted_category=pred["category"],
            confidence=pred["confidence"],
            top_tokens_json=json.dumps(pred.get("top_tokens", [])),
            user_corrected=item["normalized_merchant"] in user_overrides,
        )
        db.add(tx)
        created_rows.append(tx)

    db.commit()
    for r in created_rows:
        db.refresh(r)

    _recompute_user_rules(db, user.id)
    for r in created_rows:
        db.refresh(r)

    return {
        "ingested_count": len(created_rows),
        "transactions": [_tx_to_dict(r) for r in created_rows],
    }


@router.post("/upload-csv", status_code=201)
async def upload_csv(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload and parse a bank statement CSV file, classify all rows, and run anomaly/recurring rules."""
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail={"code": "FILE_TOO_LARGE", "message": f"CSV exceeds {settings.MAX_UPLOAD_MB} MB limit."},
        )

    parsed_rows = parse_csv_bytes(content)
    if not parsed_rows:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_CSV",
                "message": "Could not parse any valid transactions from CSV. Expected columns like Date, Description/Merchant, Amount.",
            },
        )

    corr_rows = db.query(MerchantCorrection).filter(MerchantCorrection.user_id == user.id).all()
    user_overrides = {c.normalized_merchant: c.corrected_category for c in corr_rows}

    created_rows: List[Transaction] = []
    for item in parsed_rows:
        pred = categorizer.predict(
            merchant=item["merchant"],
            raw_text=item["raw_text"],
            tx_type=item["tx_type"],
            user_overrides=user_overrides,
        )
        tx = Transaction(
            user_id=user.id,
            tx_date=item["tx_date"],
            raw_text=item["raw_text"],
            merchant=item["merchant"],
            normalized_merchant=item["normalized_merchant"],
            amount=item["amount"],
            tx_type=item["tx_type"],
            channel=item["channel"],
            reference_id=item.get("reference_id"),
            category=pred["category"],
            predicted_category=pred["category"],
            confidence=pred["confidence"],
            top_tokens_json=json.dumps(pred.get("top_tokens", [])),
            user_corrected=item["normalized_merchant"] in user_overrides,
        )
        db.add(tx)
        created_rows.append(tx)

    db.commit()
    _recompute_user_rules(db, user.id)

    return {
        "ingested_count": len(created_rows),
        "filename": file.filename,
    }


@router.post("/generate-synthetic", status_code=201)
def generate_synthetic(
    body: SyntheticGenerateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate synthetic noisy Indian UPI/SMS transactions or reset the full 3-month portfolio."""
    if body.mode == "reset_three_months":
        db.query(Transaction).filter(Transaction.user_id == user.id).delete()
        db.commit()
        count = seed_user_portfolio(db, user)
        return {"status": "reset_complete", "ingested_count": count}

    sms_lines = generate_random_sms_batch(count=body.count)
    return ingest_sms(IngestSmsRequest(text="\n".join(sms_lines)), user=user, db=db)


@router.patch("/transactions/{tx_id}/category")
def correct_transaction_category(
    tx_id: str,
    body: CategoryCorrectionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Human-in-the-Loop Active Learning:
    1. Saves the user's category correction for this merchant
    2. Retrains the TF-IDF + Logistic Regression model with up-weighted correction samples
    3. Re-classifies matching transactions for this user
    4. Re-runs recurring & anomaly detection rules
    """
    if body.category not in CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_CATEGORY", "message": f"Category must be one of: {', '.join(CATEGORIES)}"},
        )

    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Transaction not found."})

    prev_cat = tx.category
    norm_m = tx.normalized_merchant or normalize_merchant_name(tx.merchant)

    # Upsert MerchantCorrection record
    corr = (
        db.query(MerchantCorrection)
        .filter(
            MerchantCorrection.user_id == user.id,
            MerchantCorrection.normalized_merchant == norm_m,
        )
        .first()
    )
    if corr:
        corr.previous_category = prev_cat
        corr.corrected_category = body.category
        corr.raw_merchant = tx.merchant
        corr.times_applied += 1
    else:
        corr = MerchantCorrection(
            user_id=user.id,
            raw_merchant=tx.merchant,
            normalized_merchant=norm_m,
            corrected_category=body.category,
            previous_category=prev_cat,
            times_applied=1,
        )
        db.add(corr)

    # Update target transaction and optionally all transactions sharing normalized_merchant
    updated_count = 0
    if body.apply_to_similar:
        matching_txs = (
            db.query(Transaction)
            .filter(Transaction.user_id == user.id, Transaction.normalized_merchant == norm_m)
            .all()
        )
        for m_tx in matching_txs:
            m_tx.category = body.category
            m_tx.confidence = 0.99
            m_tx.user_corrected = True
            updated_count += 1
    else:
        tx.category = body.category
        tx.confidence = 0.99
        tx.user_corrected = True
        updated_count = 1

    db.commit()

    # Retrain scikit-learn TF-IDF + LogisticRegression model with all user corrections
    all_corrs = db.query(MerchantCorrection).filter(MerchantCorrection.user_id == user.id).all()
    corr_pairs = [(c.raw_merchant, c.corrected_category) for c in all_corrs]
    metrics = categorizer.train(user_corrections=corr_pairs)

    run_log = ModelTrainingRun(
        user_id=user.id,
        trigger_source="user_correction",
        training_samples=metrics["training_samples"],
        user_corrections_count=metrics["user_corrections_count"],
        cv_accuracy=metrics["cv_accuracy"],
        cv_macro_f1=metrics["cv_macro_f1"],
        duration_ms=metrics["last_train_ms"],
    )
    db.add(run_log)
    db.commit()

    # Re-evaluate rules engine
    _recompute_user_rules(db, user.id)
    db.refresh(tx)

    return {
        "transaction": _tx_to_dict(tx),
        "updated_similar_count": updated_count,
        "model_metrics": metrics,
    }


@router.delete("/transactions/{tx_id}")
def delete_transaction(
    tx_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.user_id == user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Transaction not found."})
    db.delete(tx)
    db.commit()
    return {"status": "deleted", "id": tx_id}


@router.post("/retrain")
def trigger_retrain(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger active-learning model retraining and log CV metrics."""
    all_corrs = db.query(MerchantCorrection).filter(MerchantCorrection.user_id == user.id).all()
    corr_pairs = [(c.raw_merchant, c.corrected_category) for c in all_corrs]
    metrics = categorizer.train(user_corrections=corr_pairs)

    run_log = ModelTrainingRun(
        user_id=user.id,
        trigger_source="manual_retrain",
        training_samples=metrics["training_samples"],
        user_corrections_count=metrics["user_corrections_count"],
        cv_accuracy=metrics["cv_accuracy"],
        cv_macro_f1=metrics["cv_macro_f1"],
        duration_ms=metrics["last_train_ms"],
    )
    db.add(run_log)
    db.commit()
    return {"status": "retrained", "model_metrics": metrics}


@router.get("/model-metrics")
def get_model_metrics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runs = (
        db.query(ModelTrainingRun)
        .filter(ModelTrainingRun.user_id == user.id)
        .order_by(ModelTrainingRun.created_at.desc())
        .limit(15)
        .all()
    )
    return {
        "current": categorizer.get_metrics(),
        "history": [
            {
                "id": r.id,
                "trigger_source": r.trigger_source,
                "training_samples": r.training_samples,
                "user_corrections_count": r.user_corrections_count,
                "cv_accuracy": r.cv_accuracy,
                "cv_macro_f1": r.cv_macro_f1,
                "duration_ms": r.duration_ms,
                "created_at": r.created_at.isoformat(),
            }
            for r in runs
        ],
    }


@router.put("/budgets")
def update_budgets(
    body: BudgetsUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update monthly income target and per-category monthly spend guardrails."""
    if body.monthly_income_target is not None:
        user.monthly_income_target = round(float(body.monthly_income_target), 2)

    for item in body.budgets:
        if item.category not in CATEGORIES:
            continue
        existing = (
            db.query(CategoryBudget)
            .filter(CategoryBudget.user_id == user.id, CategoryBudget.category == item.category)
            .first()
        )
        if existing:
            existing.monthly_limit = round(float(item.monthly_limit), 2)
            existing.alert_threshold_pct = round(float(item.alert_threshold_pct), 1)
            existing.updated_at = datetime.now(timezone.utc)
        else:
            db.add(
                CategoryBudget(
                    user_id=user.id,
                    category=item.category,
                    monthly_limit=round(float(item.monthly_limit), 2),
                    alert_threshold_pct=round(float(item.alert_threshold_pct), 1),
                )
            )

    db.commit()
    return _build_portfolio_analytics(db, user)


@router.post("/alerts/telegram-test")
def send_telegram_budget_alert(
    body: TelegramTestRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Build a formatted budget & anomaly digest and send via Telegram Bot API (or return preview if unconfigured)."""
    analytics = _build_portfolio_analytics(db, user)
    summary = analytics["summary"]
    forecast = analytics["forecast"]
    anomalies = analytics["anomalies"]
    budget_alerts = analytics["budget_alerts"]

    msg_lines = [
        f"📊 *PaisaPulse AI Finance Alert — {user.name}*",
        f"• Active Month ({summary['active_month']}) Spend: *₹{summary['active_month_debit']:,.0f}*",
        f"• Next-Month ({forecast['next_month']}) Forecast: *₹{forecast['total_predicted']:,.0f}* (80% CI: ₹{forecast['lower_bound']:,.0f}–₹{forecast['upper_bound']:,.0f})",
        f"• Potential Monthly Savings: *₹{forecast['potential_extra_savings']:,.0f}/mo*",
    ]

    if budget_alerts:
        msg_lines.append("\n⚠️ *Budget Guardrails Triggered:*")
        for ba in budget_alerts[:3]:
            msg_lines.append(
                f"  - {ba['category']}: ₹{ba['spent_active_month']:,.0f} / ₹{ba['monthly_limit']:,.0f} ({ba['utilization_pct']}%)"
            )

    if anomalies:
        msg_lines.append("\n🚨 *Flagged Spend Anomalies:*")
        for an in anomalies[:3]:
            msg_lines.append(
                f"  - {an['tx_date']} · {an['normalized_merchant']}: ₹{an['amount']:,.0f} ({an['anomaly_reason']})"
            )

    formatted_message = "\n".join(msg_lines)
    chat_id = (body.chat_id or user.telegram_chat_id or settings.TELEGRAM_DEFAULT_CHAT_ID or "").strip()

    delivered = False
    delivery_status = "preview_mode (Set TELEGRAM_BOT_TOKEN in .env to push live to Telegram)"

    if settings.TELEGRAM_BOT_TOKEN and chat_id:
        try:
            resp = httpx.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": formatted_message, "parse_mode": "Markdown"},
                timeout=6.0,
            )
            if resp.status_code == 200:
                delivered = True
                delivery_status = "sent_to_telegram"
            else:
                delivery_status = f"telegram_api_status_{resp.status_code}"
        except Exception as exc:
            delivery_status = f"preview_fallback ({str(exc)[:60]})"

    return {
        "delivered": delivered,
        "status": delivery_status,
        "message_preview": formatted_message,
    }


@router.get("/export.csv")
def export_transactions_csv(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all categorized transactions with ML confidence, recurring, and anomaly flags as CSV."""
    annotated, _recurring, _anomalies = _recompute_user_rules(db, user.id)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "tx_date",
            "merchant",
            "normalized_merchant",
            "amount_inr",
            "tx_type",
            "channel",
            "category",
            "ml_confidence",
            "user_corrected",
            "is_recurring",
            "recurring_interval_days",
            "is_anomaly",
            "anomaly_score",
            "anomaly_reason",
            "raw_text",
        ]
    )
    for tx in annotated:
        writer.writerow(
            [
                tx["tx_date"],
                tx["merchant"],
                tx["normalized_merchant"],
                tx["amount"],
                tx["tx_type"],
                tx["channel"],
                tx["category"],
                tx["confidence"],
                tx["user_corrected"],
                tx["is_recurring"],
                tx["recurring_interval_days"] or "",
                tx["is_anomaly"],
                tx["anomaly_score"],
                tx["anomaly_reason"] or "",
                tx["raw_text"],
            ]
        )

    return Response(
        content=buf.getvalue().encode("utf-8"),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="paisapulse_transactions_report.csv"'},
    )


@router.get("/report.pdf")
def export_financial_report_pdf(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and download a single-page A4 PDF financial & AI forecast report."""
    analytics = _build_portfolio_analytics(db, user)
    pdf_bytes = build_financial_report_pdf(
        user_name=user.name,
        summary=analytics["summary"],
        forecast=analytics["forecast"],
        recurring=analytics["recurring_subscriptions"],
        anomalies=analytics["anomalies"],
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="paisapulse_monthly_forecast_report.pdf"'},
    )
