import fnmatch
import functools
import hashlib
import inspect
import json
import logging
import os
import re
import time
from typing import Any, Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False

from cachetools import TTLCache

logger = logging.getLogger(__name__)
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "300"))
CACHE_MAXSIZE = int(os.getenv("CACHE_MAXSIZE", "10000"))
REDIS_URL = os.getenv("REDIS_URL")


class CacheService:
    """Simple cache service with optional Redis backend."""

    def __init__(self):
        self.redis_client = self._create_redis_client()
        self.memory_cache = TTLCache(maxsize=CACHE_MAXSIZE, ttl=CACHE_TTL_SECONDS)

    def __call__(self, ttl: Optional[int] = None, prefix: Optional[str] = None):
        """Use the cache service as a decorator for route/function responses."""
        ttl_seconds = ttl if ttl is not None else CACHE_TTL_SECONDS

        def decorator(func):
            if inspect.iscoroutinefunction(func):
                @functools.wraps(func)
                async def async_wrapper(*args, **kwargs):
                    cache_key = self._make_function_cache_key(func, prefix, args, kwargs)
                    cached = self.get(cache_key)
                    if cached is not None:
                        return cached
                    result = await func(*args, **kwargs)
                    self.set(cache_key, result, ttl=ttl_seconds)
                    return result

                return async_wrapper

            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = self._make_function_cache_key(func, prefix, args, kwargs)
                cached = self.get(cache_key)
                if cached is not None:
                    return cached
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl=ttl_seconds)
                return result

            return wrapper

        return decorator

    def _create_redis_client(self):
        if not REDIS_AVAILABLE or not REDIS_URL:
            return None
        try:
            client = redis.from_url(REDIS_URL, decode_responses=True)
            client.ping()
            logger.info("CacheService using Redis backend")
            return client
        except Exception as exc:
            logger.warning(f"Redis cache unavailable: {exc}")
            return None

    def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            value = self.redis_client.get(key)
            return self._deserialize(value) if value is not None else None

        cached = self.memory_cache.get(key)
        if not isinstance(cached, dict) or "__cache_value__" not in cached:
            return cached

        expires_at = cached.get("expires_at")
        if expires_at is not None and expires_at < time.monotonic():
            self.memory_cache.pop(key, None)
            return None
        return cached["__cache_value__"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if self.redis_client:
            if ttl is None:
                ttl = CACHE_TTL_SECONDS
            self.redis_client.set(key, self._serialize(value), ex=ttl)
            return

        expires_at = time.monotonic() + ttl if ttl is not None else None
        self.memory_cache[key] = {"__cache_value__": value, "expires_at": expires_at}

    def delete(self, key: str) -> None:
        if self.redis_client:
            self.redis_client.delete(key)
            return

        self.memory_cache.pop(key, None)

    def delete_pattern(self, pattern: str) -> None:
        if self.redis_client:
            self._delete_pattern_redis(pattern)
        else:
            self._delete_pattern_memory(pattern)

    def _delete_pattern_redis(self, pattern: str) -> None:
        cursor = 0
        while True:
            cursor, keys = self.redis_client.scan(cursor=cursor, match=pattern, count=500)
            if keys:
                self.redis_client.delete(*keys)
            if cursor == 0:
                break

    def _delete_pattern_memory(self, pattern: str) -> None:
        regex = fnmatch.translate(pattern)
        matcher = re.compile(regex)
        keys_to_delete = [key for key in list(self.memory_cache.keys()) if matcher.match(key)]
        for key in keys_to_delete:
            self.memory_cache.pop(key, None)

    def _make_function_cache_key(self, func, prefix: Optional[str], args: tuple, kwargs: dict) -> str:
        namespace = prefix or func.__name__
        signature = inspect.signature(func)
        bound = signature.bind_partial(*args, **kwargs)
        ignored_names = {"request", "db"}

        key_parts = {}
        for name, value in bound.arguments.items():
            if name in ignored_names:
                continue
            key_parts[name] = self._normalize_key_value(value)

        raw_key = json.dumps(key_parts, sort_keys=True, default=str)
        digest = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        return f"cache:{namespace}:{func.__name__}:{digest}"

    def _normalize_key_value(self, value: Any) -> Any:
        if hasattr(value, "user_uid"):
            return {"user_uid": getattr(value, "user_uid")}
        if hasattr(value, "id") and value.__class__.__module__.startswith("models."):
            return {"id": getattr(value, "id")}
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        if isinstance(value, (list, tuple)):
            return [self._normalize_key_value(item) for item in value]
        if isinstance(value, dict):
            return {str(key): self._normalize_key_value(item) for key, item in value.items()}
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)

    def _serialize(self, value: Any) -> str:
        return json.dumps(value, default=str)

    def _deserialize(self, value: str) -> Any:
        try:
            return json.loads(value)
        except (TypeError, json.JSONDecodeError):
            return value


cache = CacheService()
