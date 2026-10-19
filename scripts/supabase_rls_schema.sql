-- Supabase / PostgreSQL 16 Row-Level Security (RLS) Schema for PaisaPulse (Day 02)
-- Guarantees that each authenticated user can only read, insert, update, or delete their own financial rows.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'member',
    monthly_income_target DOUBLE PRECISION NOT NULL DEFAULT 85000.0,
    telegram_chat_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tx_date VARCHAR(10) NOT NULL,
    raw_text TEXT NOT NULL,
    merchant VARCHAR(180) NOT NULL,
    normalized_merchant VARCHAR(120) NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    tx_type VARCHAR(16) NOT NULL DEFAULT 'debit',
    channel VARCHAR(32) NOT NULL DEFAULT 'UPI',
    reference_id VARCHAR(64),
    category VARCHAR(64) NOT NULL,
    predicted_category VARCHAR(64) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    top_tokens_json TEXT NOT NULL DEFAULT '[]',
    user_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_interval_days INTEGER,
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    anomaly_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    anomaly_reason VARCHAR(255),
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_corrections (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_merchant VARCHAR(180) NOT NULL,
    normalized_merchant VARCHAR(120) NOT NULL,
    corrected_category VARCHAR(64) NOT NULL,
    previous_category VARCHAR(64) NOT NULL,
    times_applied INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS category_budgets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,
    monthly_limit DOUBLE PRECISION NOT NULL,
    alert_threshold_pct DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row-Level Security (RLS) on all financial tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- Policies using Supabase auth.uid() or session variable app.current_user_id
CREATE POLICY user_isolation_transactions ON transactions
    USING (user_id = COALESCE(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id = COALESCE(current_setting('app.current_user_id', true), ''));

CREATE POLICY user_isolation_corrections ON merchant_corrections
    USING (user_id = COALESCE(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id = COALESCE(current_setting('app.current_user_id', true), ''));

CREATE POLICY user_isolation_budgets ON category_budgets
    USING (user_id = COALESCE(current_setting('app.current_user_id', true), ''))
    WITH CHECK (user_id = COALESCE(current_setting('app.current_user_id', true), ''));
