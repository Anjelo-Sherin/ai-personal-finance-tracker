"""FastAPI application factory, middleware, error handlers, and startup lifecycle for PaisaPulse."""
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import SessionLocal, init_db
from app.routers import auth, contact, finance
from app.services.seed import ensure_demo_data

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("paisapulse.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        ensure_demo_data(db)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="PaisaPulse API",
        description="Day 02: AI Personal Finance Tracker with Smart Categorization, Active Learning & Prophet-Style Forecasting",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    )

    @app.middleware("http")
    async def request_id_and_security_headers(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start_t = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_t) * 1000, 2)
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        logger.info(
            json.dumps(
                {
                    "event": "http_request",
                    "request_id": req_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                }
            )
        )
        return response

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        if isinstance(exc.detail, dict) and "code" in exc.detail and "message" in exc.detail:
            return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": f"HTTP_{exc.status_code}", "message": str(exc.detail)}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        first_err = exc.errors()[0] if exc.errors() else {}
        field = ".".join(str(loc) for loc in first_err.get("loc", []) if loc != "body")
        msg = first_err.get("msg", "Invalid input.")
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"{field}: {msg}" if field else msg,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(json.dumps({"event": "unhandled_error", "path": request.url.path, "error": str(exc)}))
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected server error occurred."}},
        )

    @app.get("/health")
    def root_health():
        return {"status": "ok", "service": "paisapulse-api"}

    app.include_router(contact.router)
    app.include_router(auth.router)
    app.include_router(finance.router)

    return app


app = create_app()
