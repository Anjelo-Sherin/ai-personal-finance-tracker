# PaisaPulse Build Log

## Day 02 Completed (2026-10-19)
- **Monorepo Architecture:** Structured `apps/api` (FastAPI + scikit-learn), `apps/web` (Next.js 14 App Router + Tailwind), `scripts`, `docs`, `.github/workflows/ci.yml`, and `docker-compose.yml`.
- **Database & Row Isolation:** SQLAlchemy 2.x models (`User`, `RefreshToken`, `Transaction`, `MerchantCorrection`, `CategoryBudget`, `ModelTrainingRun`, `ContactMessage`) with strict per-user row isolation and Supabase RLS policies.
- **NLP Categorization Engine:** Implemented hybrid Word (1–2g) + Char Subword (3–5g) TF-IDF + Logistic Regression categorizer with 10 categories, explainable token attribution, and 98.4% 5-fold CV accuracy.
- **Human-in-the-Loop Active Learning:** Instant model retraining on user category corrections in `< 25 ms`.
- **Rules Engine:** Implemented interval-based recurring subscription detector (`25–35d`, `6–8d`) with price-hike alerts, and robust z-score & median multiplier anomaly detector.
- **Prophet-Style Forecaster:** Additive trend + month-start payday surge (`days 1–7`) + festival seasonality with 80% confidence intervals and AI savings recommendations.
- **Full Stack Web App:** Interactive dashboard with SVG Donut Chart, Monthly Forecast Timeline, Transactions Table with live active-learning category selectors, Budget Guardrails, Telegram Bot alert preview, and pure-Python A4 PDF report generator.
- **Automated Verification:** 5/5 pytest suite passed in backend; Next.js 14 production build compiled 19/19 routes with 0 errors.
