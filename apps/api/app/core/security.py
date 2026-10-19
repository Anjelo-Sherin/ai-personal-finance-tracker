"""Authentication, password hashing, and token security utilities."""
import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, Optional

from app.core.config import settings

COMMON_PASSWORDS = {
    "1234567890", "password123", "qwertyuiop", "123456789a", "admin12345",
    "welcome123", "letmein123", "iloveyou12", "monkey1234", "dragon1234",
    "sunshine12", "princess12", "football12", "baseball12", "superman12",
    "trustno123", "passw0rd12", "charlie123", "michael123", "shadow1234",
}


def validate_password_strength(password: str) -> Optional[str]:
    """Validate password meets PaisaPulse security rules."""
    if len(password) < 10:
        return "Password must be at least 10 characters long."
    if password.lower() in COMMON_PASSWORDS or len(set(password)) < 3:
        return "This password is too common. Please choose a stronger password."
    return None


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_hex(16)
    iterations = 260000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${dk.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password in constant time."""
    try:
        parts = password_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = parts[2]
        expected_hex = parts[3]
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
        return hmac.compare_digest(dk.hex(), expected_hex)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_jwt(payload: Dict[str, Any], expires_seconds: int) -> str:
    """Create a signed HS256 JWT token."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    body = {
        **payload,
        "iat": now,
        "exp": now + expires_seconds,
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    body_b64 = _b64url_encode(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{body_b64}".encode("ascii")
    sig = hmac.new(settings.JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)
    return f"{header_b64}.{body_b64}.{sig_b64}"


def decode_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a signed HS256 JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, body_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{body_b64}".encode("ascii")
        expected_sig = hmac.new(settings.JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(body_b64).decode("utf-8"))
        if int(time.time()) >= int(payload.get("exp", 0)):
            return None
        return payload
    except Exception:
        return None


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create a short-lived access token."""
    return create_jwt(
        {"sub": user_id, "email": email, "role": role, "purpose": "access"},
        expires_seconds=settings.JWT_ACCESS_MINUTES * 60,
    )


def generate_refresh_token() -> tuple[str, str]:
    """Generate an opaque refresh token and its SHA-256 hash."""
    raw = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, token_hash


def hash_refresh_token(raw: str) -> str:
    """Hash a raw refresh token with SHA-256."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def hash_ip(ip: str) -> str:
    """Hash client IP for privacy-preserving rate limiting."""
    return hashlib.sha256((ip + settings.JWT_SECRET[:16]).encode("utf-8")).hexdigest()[:32]
