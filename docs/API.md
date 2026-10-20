# PaisaPulse REST API Documentation

The PaisaPulse backend exposes a high-performance RESTful API powered by FastAPI with automatic Pydantic validation, sliding-window rate limiting, and strict per-user row isolation.

**Interactive OpenAPI Docs (Swagger UI):** `http://localhost:8001/docs`  
**Base URL:** `http://localhost:8001/api/v1`

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 One-Click Instant Demo Login
Logs into the pre-seeded demo user (`demo@paisapulse.ai`, *Aarav Mehta*) with 3 months of categorized historical transactions (Aug–Oct 2026).
- **Method:** `POST`
- **Path:** `/api/v1/auth/demo`
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "e4a7b921-...",
      "email": "demo@paisapulse.ai",
      "name": "Aarav Mehta (Demo Account)",
      "role": "member",
      "monthly_income_target": 85000.0,
      "telegram_chat_id": null,
      "created_at": "2026-10-19T22:30:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
  ```

### 1.2 User Signup
- **Method:** `POST`
- **Path:** `/api/v1/auth/signup`
- **Request Body:**
  ```json
  {
    "name": "Priya Nair",
    "email": "priya@example.com",
    "password": "StrongPassword#2026"
  }
  ```
- **Response `201 Created`:** Returns `user` and `access_token`. Seeds starter default category budgets and sample transactions.

### 1.3 User Login
- **Method:** `POST`
- **Path:** `/api/v1/auth/login`
- **Request Body:** `{"email": "...", "password": "..."}`
- **Response `200 OK`:** Sets httpOnly `access_token` and `refresh_token` cookies, and returns JSON payload.

### 1.4 Get Profile & Update Preferences
- **Method:** `GET /api/v1/auth/me` — returns authenticated profile.
- **Method:** `PATCH /api/v1/auth/me` — updates display name, monthly income target, and Telegram chat ID.

---

## 2. Finance & NLP Endpoints (`/api/v1/finance`)

### 2.1 Public SMS / UPI Parse Preview (Sandbox)
Parses raw text, extracts amount, date, channel, and merchant, and predicts category with top TF-IDF cues without requiring authentication.
- **Method:** `POST`
- **Path:** `/api/v1/finance/parse-preview`
- **Request Body:**
  ```json
  {
    "text": "Rs. 485.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "count": 1,
    "items": [
      {
        "raw_text": "Rs. 485.00 debited via UPI to SWIGGY*ORDER 8812 on 19-10-2026 Ref 628910421",
        "tx_date": "2026-10-19",
        "merchant": "SWIGGY*ORDER 8812",
        "normalized_merchant": "SWIGGY",
        "amount": 485.0,
        "tx_type": "debit",
        "channel": "UPI",
        "category": "Food & Dining",
        "confidence": 0.98,
        "top_tokens": ["swiggy", "order", "subword:swi", "subword:igg"],
        "probabilities": [
          {"category": "Food & Dining", "probability": 0.98},
          {"category": "Groceries & Supermarkets", "probability": 0.01},
          {"category": "Shopping & E-Commerce", "probability": 0.005}
        ]
      }
    ],
    "model_metrics": { ... }
  }
  ```

### 2.2 Dashboard Analytics & Forecasts
Returns complete portfolio analytics: KPIs, category breakdown, budget utilization, recurring subscriptions, anomaly flags, and Prophet-style monthly spend forecast.
- **Method:** `GET`
- **Path:** `/api/v1/finance/dashboard`
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
  ```json
  {
    "summary": {
      "active_month": "2026-10",
      "total_debit": 165752.0,
      "total_credit": 255000.0,
      "active_month_debit": 68310.0,
      "transaction_count": 80,
      "recurring_count": 11,
      "recurring_monthly_total": 28676.0,
      "anomaly_count": 7,
      "user_corrections_count": 4,
      "cv_accuracy_pct": 98.4,
      "cv_macro_f1_pct": 98.1,
      "last_train_ms": 21.4,
      "category_breakdown": [ ... ]
    },
    "forecast": {
      "model": "Prophet-Style Additive Seasonal + Damped Trend Forecaster",
      "next_month": "2026-11",
      "total_predicted": 70788.42,
      "lower_bound": 54587.0,
      "upper_bound": 87325.21,
      "payday_spike_share_pct": 42.0,
      "potential_extra_savings": 11450.0,
      "savings_suggestions": [ ... ]
    },
    "recurring_subscriptions": [ ... ],
    "anomalies": [ ... ]
  }
  ```

### 2.3 Human-in-the-Loop Category Correction & Retraining
- **Method:** `PATCH`
- **Path:** `/api/v1/finance/transactions/{tx_id}/category`
- **Request Body:**
  ```json
  {
    "category": "Food & Dining",
    "apply_to_similar": true
  }
  ```
- **Response `200 OK`:**
  Updates the transaction, upserts a `MerchantCorrection` record, executes a warm retrain of the scikit-learn model in `< 25 ms`, cascades the change to all transactions with matching `normalized_merchant`, and logs a `ModelTrainingRun`.

### 2.4 Ingest Bank SMS / UPI Batch
- **Method:** `POST`
- **Path:** `/api/v1/finance/ingest-sms`
- **Request Body:** `{"text": "..."}`

### 2.5 Upload Bank Statement CSV
- **Method:** `POST`
- **Path:** `/api/v1/finance/upload-csv`
- **Request:** `multipart/form-data` with `file: statement.csv`

### 2.6 Export A4 PDF and CSV Reports
- **Method:** `GET /api/v1/finance/report.pdf` — returns single-page A4 PDF financial summary.
- **Method:** `GET /api/v1/finance/export.csv` — returns full categorized transactions with anomaly and recurring flags.

### 2.7 Telegram Alert Preview / Dispatch
- **Method:** `POST /api/v1/finance/alerts/telegram-test` — dispatches or previews formatted Telegram markdown alert.
