"""JWT helpers — create and verify HS256 access tokens."""
import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

_DEV_SECRET = "retainiq-dev-secret-change-in-production"
_configured_secret = os.getenv("RETAINIQ_JWT_SECRET", "").strip()
_is_production = (
    os.getenv("RENDER", "").lower() == "true"
    or os.getenv("RETAINIQ_ENV", "").lower() == "production"
)

if _is_production and (
    not _configured_secret
    or _configured_secret == _DEV_SECRET
    or len(_configured_secret) < 32
):
    raise RuntimeError(
        "Production requires RETAINIQ_JWT_SECRET to be set to a secret "
        "with at least 32 characters."
    )

_SECRET_KEY: str = _configured_secret or _DEV_SECRET
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
