from urllib.parse import parse_qsl, urlencode

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class QueryNormalizationMiddleware(BaseHTTPMiddleware):
    """Normalize query parameters before FastAPI validation."""

    async def dispatch(self, request: Request, call_next):
        query_string = request.scope.get("query_string", b"")
        if query_string:
            try:
                raw_qs = query_string.decode("utf-8", errors="replace")
            except Exception:
                raw_qs = query_string.decode("utf-8", errors="replace")

            params = parse_qsl(raw_qs, keep_blank_values=True)
            sanitized = []
            modified = False

            for key, value in params:
                normalized_value = value.strip()
                if normalized_value != value:
                    modified = True
                sanitized.append((key, normalized_value))

            if modified:
                request.scope["query_string"] = urlencode(sanitized, doseq=True).encode("utf-8")
                if "_query_params" in request.__dict__:
                    del request.__dict__["_query_params"]

        return await call_next(request)
