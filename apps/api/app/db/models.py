"""SQLAlchemy 2.x ORM models for PaisaPulse with strict per-user row isolation."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="member", nullable=False)
    monthly_income_target: Mapped[float] = mapped_column(Float, default=85000.0, nullable=False)
    telegram_chat_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="user", cascade="all, delete-orphan"
    )
    corrections: Mapped[list["MerchantCorrection"]] = relationship(
        "MerchantCorrection", back_populates="user", cascade="all, delete-orphan"
    )
    budgets: Mapped[list["CategoryBudget"]] = relationship(
        "CategoryBudget", back_populates="user", cascade="all, delete-orphan"
    )
    training_runs: Mapped[list["ModelTrainingRun"]] = relationship(
        "ModelTrainingRun", back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    tx_date: Mapped[str] = mapped_column(String(10), index=True, nullable=False)  # YYYY-MM-DD
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    merchant: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    normalized_merchant: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    tx_type: Mapped[str] = mapped_column(String(16), default="debit", nullable=False)  # debit | credit
    channel: Mapped[str] = mapped_column(String(32), default="UPI", nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    predicted_category: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.85, nullable=False)
    top_tokens_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    user_corrected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurring_interval_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    anomaly_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="transactions")


class MerchantCorrection(Base):
    """Stores human-in-the-loop category corrections for active learning."""
    __tablename__ = "merchant_corrections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    raw_merchant: Mapped[str] = mapped_column(String(180), nullable=False)
    normalized_merchant: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    corrected_category: Mapped[str] = mapped_column(String(64), nullable=False)
    previous_category: Mapped[str] = mapped_column(String(64), nullable=False)
    times_applied: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="corrections")


class CategoryBudget(Base):
    """Per-category monthly spend limit and alert threshold."""
    __tablename__ = "category_budgets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    monthly_limit: Mapped[float] = mapped_column(Float, nullable=False)
    alert_threshold_pct: Mapped[float] = mapped_column(Float, default=80.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="budgets")


class ModelTrainingRun(Base):
    """Audit log of TF-IDF + Logistic Regression active learning training runs."""
    __tablename__ = "model_training_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    trigger_source: Mapped[str] = mapped_column(String(64), nullable=False)
    training_samples: Mapped[int] = mapped_column(Integer, nullable=False)
    user_corrections_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cv_accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    cv_macro_f1: Mapped[float] = mapped_column(Float, nullable=False)
    duration_ms: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="training_runs")


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    organization: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)
