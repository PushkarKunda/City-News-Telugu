# middleware/security_middleware.py
"""
Production Security Middleware for HyperNews API.
Implements:
1. Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
2. Correlation / Request ID tracking (X-Request-ID)
3. Latency measurement (X-Response-Time-MS)
4. Pre-auth user extraction for Rate Limiting (populates request.state.user_uid)
5. Request Size Limiting (prevents resource exhaustion)
"""
import time
import uuid
import logging
from typing import Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from jose import jwt

logger = logging.getLogger(__name__)

# Max request body size: 10MB default
MAX_REQUEST_SIZE_BYTES = 10 * 1024 * 1024


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds enterprise security headers, request ID tracking,
    and extracts authenticated user into request.state.user_uid.
    """

    def __init__(self, app, secret_key: Optional[str] = None, algorithm: str = "HS256"):
        super().__init__(app)
        self.secret_key = secret_key
        self.algorithm = algorithm

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()

        # 1. Assign or propagate Request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        # 2. Extract user_uid from Bearer token if present (for RateLimiter and audit logging)
        request.state.user_uid = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            if self.secret_key and token:
                try:
                    payload = jwt.decode(
                        token,
                        self.secret_key,
                        algorithms=[self.algorithm],
                        options={"verify_exp": False, "verify_signature": True}
                    )
                    request.state.user_uid = payload.get("sub")
                except Exception:
                    # Token invalid or signature failed; let route auth dependencies handle it
                    pass

        # 3. Guard against payload DoS
        content_length = request.headers.get("Content-Length")
        if content_length and int(content_length) > MAX_REQUEST_SIZE_BYTES:
            logger.warning("Request payload too large: %s bytes from %s", content_length, request.client.host if request.client else "unknown")
            return JSONResponse(
                status_code=413,
                content={
                    "success": False,
                    "error": "PAYLOAD_TOO_LARGE",
                    "detail": f"Request body exceeds maximum allowed limit of {MAX_REQUEST_SIZE_BYTES // (1024 * 1024)}MB",
                    "request_id": request_id
                }
            )

        # 4. Process the request
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.exception("Unhandled error processing request %s: %s", request_id, str(exc))
            raise exc

        # 5. Inject Security Headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # Allow Swagger UI, ReDoc CDN, and Google Fonts
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "connect-src 'self' https:;"
        )

        # Calculate latency
        duration = time.time() - start_time
        response.headers["X-Response-Time-MS"] = str(int(duration * 1000))

        return response