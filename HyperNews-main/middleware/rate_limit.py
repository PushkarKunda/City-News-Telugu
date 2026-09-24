# middleware/rate_limit.py
import time
from collections import defaultdict
from typing import Tuple, Optional, Callable, Dict, List
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import os
import logging
from functools import wraps
import inspect
import asyncio
from middleware.ip_whitelist import get_client_ip

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)

# Configuration
RATE_LIMITING_ENABLED = os.getenv("ENABLE_RATE_LIMITING", "true").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
ALLOW_INMEMORY = os.getenv("ALLOW_INMEMORY_RATE_LIMIT", "false").lower() == "true"


# =========================================================
# IN-MEMORY RATE LIMITER (Development)
# =========================================================

class InMemoryRateLimiter:
    """Simple in-memory rate limiter for development"""
    
    def __init__(self):
        self.requests: Dict[str, List[float]] = defaultdict(list)
        logger.info("Rate limiter using in-memory backend")
    
    def is_allowed(self, key: str, limit: int, period: int) -> Tuple[bool, int, int]:
        """
        Check if request is allowed
        Returns: (allowed, remaining, reset_time)
        """
        now = time.time()
        window_start = now - period
        
        # Clean old requests
        self.requests[key] = [t for t in self.requests[key] if t > window_start]
        
        if len(self.requests[key]) >= limit:
            oldest = min(self.requests[key]) if self.requests[key] else now
            reset_time = int(oldest + period)
            return False, 0, reset_time
        
        self.requests[key].append(now)
        remaining = limit - len(self.requests[key])
        reset_time = int(now + period)
        return True, remaining, reset_time


# =========================================================
# REDIS RATE LIMITER (Production)
# =========================================================

class RedisRateLimiter:
    """Redis-based rate limiter for production"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        logger.info("Rate limiter using Redis backend")
    
    def is_allowed(self, key: str, limit: int, period: int) -> Tuple[bool, int, int]:
        """Check rate limit using Redis sliding window"""
        now = int(time.time())
        window_start = now - period
        
        # Use Lua script for atomic operation
        lua_script = """
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window_start = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local period = tonumber(ARGV[4])
        
        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
        
        -- Get current count
        local current_count = redis.call('ZCARD', key)
        
        if current_count >= limit then
            -- Get oldest request for reset time
            local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
            local reset_time = oldest[2] + period
            return {0, 0, reset_time}
        end
        
        -- Add current request
        redis.call('ZADD', key, now, now)
        redis.call('EXPIRE', key, period)
        
        local remaining = limit - (current_count + 1)
        local reset_time = now + period
        return {1, remaining, reset_time}
        """
        
        try:
            result = self.redis.eval(lua_script, 1, key, now, window_start, limit, period)
            allowed, remaining, reset_time = result
            return bool(allowed), remaining, int(reset_time)
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            # Fallback to allow on error (fail open)
            return True, limit - 1, now + period


# =========================================================
# RATE LIMIT CONFIGURATION (Combined)
# =========================================================

RATE_LIMITS = {
    # General endpoints
    "rewards_read": {"limit": 100, "period": 60},      # 100 per minute
    "rewards_write": {"limit": 50, "period": 60},      # 50 per minute
    
    # Sensitive endpoints
    "ad_claim": {"limit": 10, "period": 60},           # 10 ad claims per minute
    "referral_use": {"limit": 5, "period": 300},       # 5 referrals per 5 minutes
    "bingo_claim": {"limit": 1, "period": 3600},       # 1 bingo claim per hour
    
    # Admin endpoints
    "admin_read": {"limit": 200, "period": 60},        # 200 per minute
    "admin_write": {"limit": 60, "period": 60},        # 60 per minute
    "admin_bulk": {"limit": 10, "period": 300},        # 10 per 5 minutes
    "admin_rewards": {"limit": 200, "period": 60},     # Backward compatibility
    
    # Auth endpoints (from old version)
    "otp_send": {"limit": 3, "period": 300},           # 3 per 5 minutes
    "otp_verify": {"limit": 10, "period": 300},        # 10 per 5 minutes
    "auth_login": {"limit": 10, "period": 300},        # 10 per 5 minutes
    
    # Public endpoints
    "public_read": {"limit": 100, "period": 60},       # 100 per minute
    "public_search": {"limit": 50, "period": 60},      # 50 per minute
    
    # Authenticated endpoints
    "auth_read": {"limit": 200, "period": 60},         # 200 per minute
    "auth_write": {"limit": 50, "period": 60},         # 50 per minute
    
    # News endpoints
    "news_read": {"limit": 150, "period": 60},         # 150 per minute
    "news_write": {"limit": 30, "period": 60},         # 30 per minute
    "news_feed": {"limit": 100, "period": 60},         # 100 per minute
    "news_search": {"limit": 50, "period": 60},        # 50 per minute
    
    # Insights endpoints
    "insights_read": {"limit": 100, "period": 60},     # 100 per minute
    "insights_write": {"limit": 30, "period": 60},     # 30 per minute
    "insights_share": {"limit": 20, "period": 60},     # 20 per minute
}


# =========================================================
# RATE LIMITER MANAGER
# =========================================================

class RateLimiterManager:
    """Singleton manager for rate limiter instance"""
    
    _instance = None
    _limiter = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_limiter(self):
        """Get or create rate limiter instance"""
        if self._limiter is not None:
            return self._limiter
        
        if not RATE_LIMITING_ENABLED:
            self._limiter = InMemoryRateLimiter()
            return self._limiter
        
        is_production = ENVIRONMENT == "production"
        redis_url = os.getenv("REDIS_URL")
        
        # Try Redis if available and configured
        if REDIS_AVAILABLE and redis_url:
            try:
                redis_client = redis.from_url(redis_url)
                redis_client.ping()
                self._limiter = RedisRateLimiter(redis_client)
                return self._limiter
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Falling back to in-memory rate limiter.")
                self._limiter = InMemoryRateLimiter()
                return self._limiter
        
        # Fallback to in-memory
        if is_production and not ALLOW_INMEMORY:
            logger.warning("REDIS_URL not configured for rate limiting in production; using in-memory limiter.")
        
        self._limiter = InMemoryRateLimiter()
        return self._limiter


# Global rate limiter instance
_rate_limiter_manager = RateLimiterManager()


def get_rate_limiter():
    """Get rate limiter instance"""
    return _rate_limiter_manager.get_limiter()


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def get_user_identifier(request: Request, user_uid: str = None) -> str:
    """Get rate limit identifier (user UID or IP)"""
    if user_uid:
        return f"user:{user_uid}"
    return f"ip:{get_client_ip(request)}"


def get_rate_limit_key(request: Request, user_uid: Optional[str] = None) -> str:
    """Generate rate limit key based on user or IP"""
    return get_user_identifier(request, user_uid)


# =========================================================
# DECORATOR-BASED RATE LIMITING
# =========================================================

def rate_limit(limit_type: str, key_func: Optional[Callable] = None):
    """
    Rate limiting decorator for endpoints (handles both sync and async)
    
    Usage:
        @router.get("/endpoint")
        @rate_limit("rewards_read")
        def endpoint():
            ...
    """
    def decorator(func):
        is_async = asyncio.iscoroutinefunction(func)
        
        if is_async:
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                if not RATE_LIMITING_ENABLED:
                    return await func(*args, **kwargs)
                
                # Get request from kwargs or args
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                if not request:
                    for kwarg in kwargs.values():
                        if isinstance(kwarg, Request):
                            request = kwarg
                            break
                
                if not request:
                    return await func(*args, **kwargs)
                
                # Get rate limit config
                config = RATE_LIMITS.get(limit_type)
                if not config:
                    return await func(*args, **kwargs)
                
                # Get current user from request state
                user_uid = getattr(request.state, "user_uid", None)
                
                # Generate rate limit key
                if key_func:
                    key = key_func(request)
                else:
                    key = get_rate_limit_key(request, user_uid)
                
                full_key = f"rate_limit:{limit_type}:{key}"
                
                # Check rate limit
                limiter = get_rate_limiter()
                allowed, remaining, reset_time = limiter.is_allowed(
                    full_key,
                    config["limit"],
                    config["period"]
                )
                
                # Prepare headers
                headers = {
                    "X-RateLimit-Limit": str(config["limit"]),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(reset_time)
                }
                
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Maximum {config['limit']} requests per {config['period']} seconds.",
                        headers=headers
                    )
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Add headers to response if it's a Response object
                if hasattr(result, "headers"):
                    for k, v in headers.items():
                        result.headers[k] = v
                
                return result
            
            # Preserve signature for FastAPI/OpenAPI introspection
            try:
                async_wrapper.__signature__ = inspect.signature(func)
            except Exception:
                pass
            
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                if not RATE_LIMITING_ENABLED:
                    return func(*args, **kwargs)
                
                # Get request from kwargs or args
                request = None
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                if not request:
                    for kwarg in kwargs.values():
                        if isinstance(kwarg, Request):
                            request = kwarg
                            break
                
                if not request:
                    return func(*args, **kwargs)
                
                # Get rate limit config
                config = RATE_LIMITS.get(limit_type)
                if not config:
                    return func(*args, **kwargs)
                
                # Get current user from request state
                user_uid = getattr(request.state, "user_uid", None)
                
                # Generate rate limit key
                if key_func:
                    key = key_func(request)
                else:
                    key = get_rate_limit_key(request, user_uid)
                
                full_key = f"rate_limit:{limit_type}:{key}"
                
                # Check rate limit
                limiter = get_rate_limiter()
                allowed, remaining, reset_time = limiter.is_allowed(
                    full_key,
                    config["limit"],
                    config["period"]
                )
                
                # Prepare headers
                headers = {
                    "X-RateLimit-Limit": str(config["limit"]),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(reset_time)
                }
                
                if not allowed:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded. Maximum {config['limit']} requests per {config['period']} seconds.",
                        headers=headers
                    )
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Add headers to response if it's a Response object
                if hasattr(result, "headers"):
                    for k, v in headers.items():
                        result.headers[k] = v
                
                return result
            
            # Preserve signature for FastAPI/OpenAPI introspection
            try:
                sync_wrapper.__signature__ = inspect.signature(func)
            except Exception:
                pass
            
            return sync_wrapper
    
    return decorator


# =========================================================
# MIDDLEWARE-BASED RATE LIMITING
# =========================================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Global rate limiting middleware for all endpoints"""
    
    async def dispatch(self, request: Request, call_next):
        if not RATE_LIMITING_ENABLED:
            return await call_next(request)
        
        path = request.url.path
        method = request.method
        
        # Skip rate limiting for health checks
        if "/health" in path or "/ping" in path:
            return await call_next(request)
        
        # Get user from request state (set by auth middleware)
        user_uid = getattr(request.state, "user_uid", None)
        
        # Determine rate limit type
        limit_type = self._get_limit_type(path, method, user_uid)
        
        if limit_type and limit_type in RATE_LIMITS:
            config = RATE_LIMITS[limit_type]
            key = get_rate_limit_key(request, user_uid)
            full_key = f"rate_limit:{limit_type}:{key}"
            
            limiter = get_rate_limiter()
            allowed, remaining, reset_time = limiter.is_allowed(
                full_key,
                config["limit"],
                config["period"]
            )
            
            if not allowed:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": True,
                        "detail": f"Rate limit exceeded. Maximum {config['limit']} requests per {config['period']} seconds.",
                        "limit": config["limit"],
                        "remaining": 0,
                        "retry_after": config["period"],
                        "reset_time": reset_time
                    },
                    headers={
                        "X-RateLimit-Limit": str(config["limit"]),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_time),
                        "Retry-After": str(config["period"])
                    }
                )
            
            # Process request and add headers
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(config["limit"])
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(reset_time)
            return response
        
        return await call_next(request)
    
    def _get_limit_type(self, path: str, method: str, user_uid: Optional[str]) -> Optional[str]:
        """Determine rate limit type based on path"""
        
        # =========================================================
        # REWARDS MODULE ENDPOINTS (Primary focus)
        # =========================================================
        if "/rewards" in path:
            if "/ad/" in path or "/claim" in path or "/ad/rewarded" in path:
                return "ad_claim"
            elif method == "GET":
                return "rewards_read"
            else:
                return "rewards_write"
        
        elif "/referral" in path:
            if "/use-referral" in path:
                return "referral_use"
            else:
                return "rewards_read"
        
        elif "/bingo" in path:
            if "/claim" in path:
                return "bingo_claim"
            else:
                return "rewards_read"
        
        # =========================================================
        # ADMIN ENDPOINTS
        # =========================================================
        if "/admin" in path:
            if "bulk" in path:
                return "admin_bulk"
            if method in ["POST", "PUT", "PATCH", "DELETE"]:
                return "admin_write"
            if method == "GET":
                return "admin_read"
            return "admin_rewards"
        
        # =========================================================
        # AUTH ENDPOINTS
        # =========================================================
        if "/auth" in path:
            if "/send-otp" in path:
                return "otp_send"
            if "/verify-otp" in path:
                return "otp_verify"
            if "/login" in path:
                return "auth_login"
        
        # =========================================================
        # NEWS ENDPOINTS
        # =========================================================
        if "/news" in path or "/v1" in path:
            if method in ["POST", "PUT", "PATCH", "DELETE"]:
                return "news_write"
            if "/feed" in path:
                return "news_feed"
            if "/search" in path:
                return "news_search"
            return "news_read"
        
        # =========================================================
        # INSIGHTS ENDPOINTS
        # =========================================================
        if "/insights" in path:
            if method in ["POST", "PUT", "PATCH", "DELETE"]:
                return "insights_write"
            if "/share" in path:
                return "insights_share"
            return "insights_read"
        
        # =========================================================
        # SEARCH ENDPOINTS
        # =========================================================
        if "/search" in path:
            return "public_search"
        
        # =========================================================
        # DEFAULT
        # =========================================================
        if method == "GET":
            return "public_read" if not user_uid else "auth_read"
        return "auth_write" if user_uid else "public_read"


# =========================================================
# DEPENDENCY FOR ROUTES
# =========================================================

async def check_rate_limit(request: Request, limit_type: str):
    """Dependency for checking rate limits in routes"""
    if not RATE_LIMITING_ENABLED:
        return True
    
    config = RATE_LIMITS.get(limit_type)
    if not config:
        return True
    
    user_uid = getattr(request.state, "user_uid", None)
    key = get_rate_limit_key(request, user_uid)
    full_key = f"rate_limit:{limit_type}:{key}"
    
    limiter = get_rate_limiter()
    allowed, remaining, reset_time = limiter.is_allowed(
        full_key,
        config["limit"],
        config["period"]
    )
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {config['limit']} requests per {config['period']} seconds.",
            headers={
                "X-RateLimit-Limit": str(config["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_time)
            }
        )
    
    return True
