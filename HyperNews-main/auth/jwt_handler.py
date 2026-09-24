# auth/jwt_handler.py
"""
JWT Token Management and Password Hashing Utilities.
Provides:
- Secure access token generation with explicit type="access"
- Refresh token generation with rotation support
- Safe token decoding with claim validation
- Password hashing & verification
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import os
import logging
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "hypernews-default-secret-key-change-in-prod-min-32-chars")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Safely verify plain password against hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as exc:
        logger.warning("Password verification failed with exception: %s", exc)
        return False


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)


hash_password = get_password_hash


def create_access_token(data: Dict[str, Any], token_version: int, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT access token with type='access' and token version."""
    to_encode = data.copy()
    if "sub" not in to_encode:
        raise ValueError("Access token payload must include 'sub' claim")

    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": now,
        "ver": token_version,
        "type": "access"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: Dict[str, Any], token_version: int = 0, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed JWT refresh token with type='refresh'."""
    to_encode = data.copy()
    if "sub" not in to_encode:
        raise ValueError("Refresh token payload must include 'sub' claim")

    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({
        "exp": expire,
        "iat": now,
        "ver": token_version,
        "type": "refresh"
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_password_reset_token(user_uid: str, token_version: int = 0, expires_delta: Optional[timedelta] = None) -> str:
    """Generate an expiring, signed JWT password reset token with type='password_reset'."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=int(os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "15"))))
    to_encode = {
        "sub": user_uid,
        "exp": expire,
        "iat": now,
        "ver": token_version,
        "type": "password_reset"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Decode and validate token signature, expiration, and optionally token type.
    Raises ExpiredSignatureError, JWTClaimsError, or JWTError on failure.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if expected_type:
        token_type = payload.get("type")
        # Legacy tokens might not have type, accept them only if not strictly required
        if token_type and token_type != expected_type:
            raise JWTClaimsError(f"Invalid token type: expected {expected_type}, got {token_type}")
    return payload


verify_token = decode_token
