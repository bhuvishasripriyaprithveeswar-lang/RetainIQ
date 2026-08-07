"""JWT helpers — create and verify HS256 access tokens."""
import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

# Read secret from environment; fall back to a dev-only default
_SECRET_KEY: str = os.getenv("RETAINIQ_JWT_SECRET", "retainiq-dev-secret-change-in-production")
_ALGORITHM = "HS256"
_ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(subject: str | int) -> str:
    """
    Create a signed JWT for *subject* (user id as string).
    Expires in ACCESS_TOKEN_EXPIRE_MINUTES minutes from now (UTC).
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def verify_access_token(token: str) -> dict:
    """
    Decode and verify a JWT.
    Returns the decoded payload dict.
    Raises jose.JWTError on invalid / expired tokens.
    """
    return jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
