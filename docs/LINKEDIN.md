# LinkedIn Showcase Kit & Interview Prep — Day 02: PaisaPulse

## Ready-to-Post LinkedIn Draft

**Day 02/30 — PaisaPulse: AI Personal Finance Tracker with Smart Categorization** 💳📈

Most expense trackers force you to manually tag every single purchase, or completely choke on messy Indian UPI merchant strings like `SWIGGY*ORDER 8812` or `UPI/328910421/DR/ZOMATO MEDIA/HDFC`.

Today I built **PaisaPulse**, a full-stack expense tracker that reads noisy bank alerts and turns them into clean categories, subscription alerts, and next-month forecasts:

🔹 **Smart NLP Categorizer + Explainability:** Combines word n-grams and character subword n-grams (3–5g) with balanced Logistic Regression in scikit-learn. It extracts amount, date, and payment channel with regex, classifies 10 spending categories in <1.2 ms on CPU, and highlights the exact TF-IDF tokens that drove the prediction.
🔹 **Human-in-the-Loop Active Learning:** When you correct any category in the dashboard, PaisaPulse saves your feedback, up-weights the correction, and retrains the model in <25 ms. Similar transactions from that merchant are updated automatically!
🔹 **Rules Engine + Prophet-Style Forecaster:** Detects recurring subscriptions (Netflix, Spotify, broadband, rent), catches stealth price hikes, flags unusually large spend spikes with robust z-scores, and forecasts next month's spending while accounting for the days 1–7 payday surge.
🔹 **Privacy by Design:** Strict per-user row isolation (PostgreSQL RLS / SQLite), zero banking password storage, and 1-click A4 PDF/CSV report export.

Built with Next.js 14, Tailwind CSS, FastAPI, SQLAlchemy, scikit-learn, and NumPy. 5/5 automated tests passing!

#30ProjectsIn30Days #FullStack #MachineLearning #NLP #FastAPI #NextJS #Fintech #BuildInPublic

---

## 5 Top Interview Talking Points & Answers

1. **Why use character subword n-grams (3–5 chars) instead of word n-grams alone?**
   - Bank narrations frequently truncate brand names (e.g. `SWGGY*ORD` or `AMZN*MKTP IN`). Character n-grams allow the classifier to match substrings and morphological variations that pure dictionary or token lookups fail on.
2. **How does human-in-the-loop active learning work in PaisaPulse?**
   - When a user corrects a transaction, we store a `MerchantCorrection` record, inject it into the training set with 6× sample weight, and retrain the scikit-learn pipeline in RAM in under 25 ms.
3. **How do you prevent false-positive anomaly alerts on recurring payments like monthly rent?**
   - Fixed monthly rent payments are recognized by the recurring interval matching engine (`25–35` day cadence) and are exempted from standard spend-spike anomaly flags unless the charge experiences an extreme unexpected jump.
4. **Why choose an additive trend + payday seasonal model over raw ARIMA or heavy neural nets?**
   - Personal spending history is typically short (3–12 months) where deep time-series models overfit. Decomposing the series into a damped trend, month-start payday surge (`days 1–7`), and festival multipliers provides interpretable 80% confidence bands without latency or heavy compute.
5. **How is Row-Level Security (RLS) architected?**
   - In PostgreSQL, RLS policies check `user_id = current_setting('app.current_user_id')`, ensuring that even direct SQL queries cannot leak cross-user financial records.
