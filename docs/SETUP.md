# PaisaPulse Setup & Installation Guide

This guide walks you through setting up and running **PaisaPulse** on macOS, Linux, or Windows.

---

## 1. Prerequisites

- **Python:** 3.9+ (Python 3.10 or 3.11 recommended)
- **Node.js:** v18+ or v20+
- **npm / pnpm / yarn**
- **Git**
- *(Optional)* Docker & Docker Compose for PostgreSQL 16 containerization

---

## 2. Clone the Repository

```bash
git clone https://github.com/Anjelo-Sherin/paisapulse.git
cd paisapulse
```

---

## 3. Environment Configuration

Copy the example environment configuration:
```bash
cp .env.example .env
```

Default local `.env` settings:
```dotenv
APP_ENV=development
DATABASE_URL=sqlite:///./paisapulse.db
JWT_SECRET=a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90
JWT_ACCESS_MINUTES=30
JWT_REFRESH_DAYS=14
COOKIE_DOMAIN=localhost
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

---

## 4. Backend Setup (FastAPI + scikit-learn)

1. Navigate to the API application directory:
   ```bash
   cd apps/api
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate    # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server (running on port **8001**):
   ```bash
   PYTHONPATH=. uvicorn app.main:app --port 8001 --reload
   ```

*The API will initialize the database schema and automatically seed the pre-populated 3-month demo dataset on first startup!*

---

## 5. Frontend Setup (Next.js 14)

Open a new terminal window:

1. Navigate to the web application directory:
   ```bash
   cd apps/web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server (running on port **3001**):
   ```bash
   npm run dev
   ```

Open your browser at **`http://localhost:3001`**. Click **"1-Click Demo"** to access the pre-seeded demo portfolio instantly.

---

## 6. Docker Compose Setup (Optional)

If you prefer running everything inside Docker with PostgreSQL 16:
```bash
docker compose up --build
```
This starts PostgreSQL 16 on port 5432 with native Row-Level Security, FastAPI on port 8000, and Next.js on port 3000.

---

## 7. Running Automated Tests

Run the complete backend test suite:
```bash
cd apps/api
PYTHONPATH=. pytest -v
```

Run the end-to-end integration verification workflow:
```bash
cd apps/api
PYTHONPATH=. python tests/test_e2e_workflow.py
```
