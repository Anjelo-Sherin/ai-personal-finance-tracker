# PaisaPulse Architecture & NLP Specification

## 1. Non-Negotiable Privacy & Data Isolation Architecture
1. **Row-Level Security (RLS) Isolation:** Every table (`transactions`, `merchant_corrections`, `category_budgets`, `model_training_runs`) includes a mandatory `user_id` foreign key. Row-Level Security policies in PostgreSQL guarantee that user queries can never see or mutate another tenant's rows.
2. **Zero Biometric or Credential Storage:** PaisaPulse operates purely on the text of bank alert SMS or statement CSVs. No bank account passwords, netbanking credentials, OTPs, or debit card CVVs are requested or stored.
3. **Local Active Learning Memory:** User corrections are recorded per account to continuously adapt the TF-IDF classification weights without poisoning global models.

## 2. NLP Categorization Pipeline (`apps/api/app/ml/classifier.py`)
- **Feature Union Pipeline:**
  - `word_tfidf`: Word 1–2 n-grams (`sublinear_tf=True`, `max_features=3000`)
  - `char_tfidf`: Character subword 3–5 n-grams (`analyzer="char_wb"`, `sublinear_tf=True`, `max_features=5000`)
- **Classifier:** `LogisticRegression(C=4.0, class_weight="balanced", max_iter=500)`
- **Explainability:** Extracts top positive-weighted TF-IDF tokens per prediction so users understand why a merchant was labeled.
- **Active Learning Retraining:** When a user modifies a category, `SmartCategorizer.train()` up-weights the user's correction pairs (6× weight) and re-fits in `< 25 ms` on CPU.

## 3. Rules Engine Specification (`apps/api/app/ml/rules.py`)
- **Recurring Payment Detection:** Groups by `normalized_merchant`. Detects intervals:
  - Monthly: `25 <= median_interval <= 35` days with `cv_amount <= 0.35`
  - Weekly: `6 <= median_interval <= 8` days
  - Flags price increases if `(latest_amount - previous_amount) / previous_amount >= 5%`
- **Anomaly Detection:** Computes per-category robust statistics (`median`, `MAD * 1.4826`, `mean`). Flags transactions where `amount >= 800 INR` and `z_score >= 2.0` or `amount >= 2.8 * median`.

## 4. Prophet-Style Forecaster (`apps/api/app/ml/forecaster.py`)
- Models trend + payday seasonality (`days 1–7` salary/rent cycle) + festival multipliers for Q4 (Diwali/year-end spikes) with 80% confidence interval bands.
