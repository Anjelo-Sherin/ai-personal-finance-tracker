"""Public contact form submission route."""
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limiter
from app.core.security import hash_ip
from app.db.models import ContactMessage
from app.db.session import get_db

router = APIRouter(prefix="/api/v1/contact", tags=["contact"])

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: str = Field(..., min_length=3, max_length=255)
    organization: Optional[str] = Field(None, max_length=180)
    message: str = Field(..., min_length=10, max_length=3000)


@router.post("", status_code=201)
def submit_contact(
    body: ContactRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not rate_limiter.allow(f"contact:{hash_ip(client_ip)}", 5, 60.0):
        raise HTTPException(
            status_code=429,
            detail={"code": "RATE_LIMIT", "message": "Too many messages sent. Please wait a minute."},
        )

    email_norm = body.email.strip().lower()
    if not EMAIL_REGEX.match(email_norm):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_EMAIL", "message": "Please enter a valid email address."},
        )

    msg = ContactMessage(
        name=body.name.strip(),
        email=email_norm,
        organization=body.organization.strip() if body.organization else None,
        message=body.message.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "status": "received"}
