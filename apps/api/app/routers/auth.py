"""Authentication routes: signup, login, refresh rotation, logout, me, profile update, demo login."""
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.core.security import (
    create_access_token,
    decode_jwt,
    generate_refresh_token,
    hash_ip,
    hash_password,
    hash_refresh_token,
    validate_password_strength,
    verify_password,
)
from app.db.models import RefreshToken, User
from app.db.session import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=10, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    monthly_income_target: Optional[float] = Field(None, ge=1000.0, le=10000000.0)
    telegram_chat_id: Optional[str] = Field(None, max_length=64)
    current_password: Optional[str] = None
    new_password: Optional[str] = None


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "monthly_income_target": user.monthly_income_target,
        "telegram_chat_id": user.telegram_chat_id,
        "created_at": user.created_at.isoformat(),
    }


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    is_prod = settings.APP_ENV == "production"
    samesite_val = "none" if is_prod else "lax"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite=samesite_val,  # type: ignore
        max_age=settings.JWT_ACCESS_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite=samesite_val,  # type: ignore
        max_age=settings.JWT_REFRESH_DAYS * 86400,
        path="/api/v1/auth",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth")


def get_current_user(
    request: Request,
    access_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency returning the authenticated User via cookie or Bearer token."""
    token = access_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Authentication required."},
        )

    payload = decode_jwt(token)
    if not payload or payload.get("purpose") != "access":
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token."},
        )

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"code": "USER_NOT_FOUND", "message": "Account no longer exists."},
        )
    return user


@router.post("/signup", status_code=201)
def signup(
    body: SignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    from app.services.seed import seed_user_portfolio

    client_ip = request.client.host if request.client else "127.0.0.1"
    email_norm = body.email.strip().lower()

    if not rate_limiter.allow(f"signup:{hash_ip(client_ip)}", 10, 60.0):
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT", "message": "Too many signup attempts. Please wait a minute."},
        )

    if not EMAIL_REGEX.match(email_norm):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_EMAIL", "message": "Please enter a valid email address."},
        )

    pw_err = validate_password_strength(body.password)
    if pw_err:
        raise HTTPException(status_code=400, detail={"code": "WEAK_PASSWORD", "message": pw_err})

    existing = db.query(User).filter(User.email == email_norm).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail={"code": "AUTH_FAILED", "message": "Unable to create account with those credentials."},
        )

    user = User(
        email=email_norm,
        name=body.name.strip(),
        password_hash=hash_password(body.password),
        role="member",
        monthly_income_target=85000.0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed starter budgets and sample transactions so the new user immediately sees a live dashboard
    seed_user_portfolio(db, user)

    access_jwt = create_access_token(user.id, user.email, user.role)
    raw_refresh, refresh_hash = generate_refresh_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_DAYS),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(rt)
    db.commit()

    _set_auth_cookies(response, access_jwt, raw_refresh)
    return {"user": _user_dict(user), "access_token": access_jwt}


@router.post("/login")
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    email_norm = body.email.strip().lower()

    if not rate_limiter.allow(f"login:{hash_ip(client_ip)}:{email_norm}", 10, 60.0):
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT", "message": "Too many login attempts. Please wait a minute."},
        )

    user = db.query(User).filter(User.email == email_norm).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password."},
        )

    access_jwt = create_access_token(user.id, user.email, user.role)
    raw_refresh, refresh_hash = generate_refresh_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_DAYS),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(rt)
    db.commit()

    _set_auth_cookies(response, access_jwt, raw_refresh)
    return {"user": _user_dict(user), "access_token": access_jwt}


@router.post("/refresh")
def refresh_tokens(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(
            status_code=401, detail={"code": "NO_REFRESH_TOKEN", "message": "Refresh token missing."}
        )

    t_hash = hash_refresh_token(refresh_token)
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == t_hash).first()
    now = datetime.now(timezone.utc)

    if not rt:
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=401, detail={"code": "INVALID_REFRESH", "message": "Invalid refresh token."}
        )

    if rt.revoked_at is not None:
        db.query(RefreshToken).filter(
            RefreshToken.user_id == rt.user_id, RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": now})
        db.commit()
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=401,
            detail={"code": "TOKEN_REUSE_DETECTED", "message": "Session revoked for security."},
        )

    exp = rt.expires_at if rt.expires_at.tzinfo else rt.expires_at.replace(tzinfo=timezone.utc)
    if now >= exp:
        rt.revoked_at = now
        db.commit()
        _clear_auth_cookies(response)
        raise HTTPException(
            status_code=401,
            detail={"code": "REFRESH_EXPIRED", "message": "Session expired. Please log in again."},
        )

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail={"code": "USER_NOT_FOUND", "message": "User not found."})

    rt.revoked_at = now
    new_raw, new_hash = generate_refresh_token()
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_hash,
        expires_at=now + timedelta(days=settings.JWT_REFRESH_DAYS),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(new_rt)
    db.commit()

    access_jwt = create_access_token(user.id, user.email, user.role)
    _set_auth_cookies(response, access_jwt, new_raw)
    return {"access_token": access_jwt}


@router.post("/logout")
def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if refresh_token:
        t_hash = hash_refresh_token(refresh_token)
        rt = db.query(RefreshToken).filter(RefreshToken.token_hash == t_hash).first()
        if rt and rt.revoked_at is None:
            rt.revoked_at = datetime.now(timezone.utc)
            db.commit()
    _clear_auth_cookies(response)
    return {"status": "logged_out"}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"user": _user_dict(user)}


@router.patch("/me")
def update_me(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.name:
        user.name = body.name.strip()
    if body.monthly_income_target is not None:
        user.monthly_income_target = round(float(body.monthly_income_target), 2)
    if body.telegram_chat_id is not None:
        user.telegram_chat_id = body.telegram_chat_id.strip() or None
    if body.new_password:
        if not body.current_password or not verify_password(body.current_password, user.password_hash):
            raise HTTPException(
                status_code=400, detail={"code": "BAD_PASSWORD", "message": "Current password is incorrect."}
            )
        pw_err = validate_password_strength(body.new_password)
        if pw_err:
            raise HTTPException(status_code=400, detail={"code": "WEAK_PASSWORD", "message": pw_err})
        user.password_hash = hash_password(body.new_password)
    db.commit()
    db.refresh(user)
    return {"user": _user_dict(user)}


@router.delete("/me")
def delete_account(
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.delete(user)
    db.commit()
    _clear_auth_cookies(response)
    return {"status": "account_deleted"}


@router.post("/demo")
def demo_login(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """One-click instant login into the pre-seeded Demo Account."""
    from app.services.seed import ensure_demo_data

    user = ensure_demo_data(db)
    access_jwt = create_access_token(user.id, user.email, user.role)
    raw_refresh, refresh_hash = generate_refresh_token()
    rt = RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_DAYS),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(rt)
    db.commit()

    _set_auth_cookies(response, access_jwt, raw_refresh)
    return {"user": _user_dict(user), "access_token": access_jwt}
