# config/settings.py
"""
Centralized application settings using Pydantic Settings.
Manages environment variables, security configurations, database URLs,
Redis, Google Ads/AdMob, and rate limiting thresholds.
"""
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class AppSettingsConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core
    APP_NAME: str = "HyperNews"
    ENVIRONMENT: str = Field(default="development", description="development, staging, or production")
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/hypernews",
        description="SQLAlchemy database connection string"
    )
    AUTO_CREATE_TABLES: bool = False

    # Redis & Cache
    REDIS_URL: Optional[str] = None
    CACHE_TTL_SECONDS: int = 300
    ENABLE_RATE_LIMITING: bool = True
    ALLOW_INMEMORY_RATE_LIMIT: bool = True

    # Security & Tokens
    SECRET_KEY: str = Field(
        default="hypernews-default-secret-key-change-in-prod-min-32-chars",
        description="JWT secret key"
    )
    SESSION_SECRET_KEY: str = Field(
        default="hypernews-session-secret-change-in-prod-min-32-chars",
        description="Session secret key"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15
    ENCRYPTION_KEY: Optional[str] = None

    # CORS
    CORS_ALLOW_ORIGINS: str = "http://127.0.0.1:8000,http://localhost:8000,https://hypernews-production.up.railway.app"

    # News & Ingestion
    MAX_FEED_ITEMS_PER_PAGE: int = 50
    DEFAULT_FEED_ITEMS: int = 20
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.82
    DUPLICATE_EXACT_THRESHOLD: float = 0.95
    DUPLICATE_LOOKBACK_DAYS: int = 7

    # Ad & Monetization
    AD_FREQUENCY_INTERVAL: int = 5   # Serve 1 ad every 5 news cards
    SPONSORED_FREQUENCY_INTERVAL: int = 7  # Serve 1 sponsored post every 7 news cards
    MAX_ADS_PER_SESSION: int = 20
    ADMOB_APP_ID_ANDROID: Optional[str] = None
    ADMOB_APP_ID_IOS: Optional[str] = None
    GOOGLE_AD_MANAGER_NETWORK_CODE: Optional[str] = None

    # External APIs
    YOUTUBE_API_KEY: Optional[str] = None
    BREVO_API_KEY: Optional[str] = None

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT.lower() == "testing"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ALLOW_ORIGINS.split(",") if o.strip()]


settings = AppSettingsConfig()

