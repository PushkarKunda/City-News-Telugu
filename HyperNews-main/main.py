# main.py - Fixed with Rewards Module Integration
import os
import sys
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
import logging
from datetime import datetime, timezone

from database import init_db, get_db
from sqlalchemy import text
from sqlalchemy.orm import Session
from scheduler import start_notification_cleaner

# Import rate limit and security middleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.query_normalization import QueryNormalizationMiddleware
from middleware.security_middleware import SecurityHeadersMiddleware

# Import all routes
from routes import (
    base_location_routes,
    insights_router,
    user_routes,
    news_routes,
    content_routes,
    engagement_routes,
    admin_routes,
    admin_settings_routes,
    category_routes,
    notification_routes,
    rewards_routes,  # Rewards routes already imported
    user_activity_routes,
    post_routes,
    follow_routes,
    discovery_routes,
    short_routes
)

from contextlib import asynccontextmanager
from config.settings import settings

# Setup settings aliases
is_production = settings.is_production
_session_secret_key = settings.SESSION_SECRET_KEY

# =====================================================
# SETUP LOGGING FOR PRODUCTION
# =====================================================
logging.basicConfig(
    level=logging.INFO if is_production else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


# =====================================================
# LIFESPAN CONTEXT MANAGER
# =====================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown lifecycle"""
    logger.info("Starting up %s (environment=%s)...", settings.APP_NAME, settings.ENVIRONMENT)

    # 1. Database Initialization if enabled or non-production local run
    if not settings.is_production or os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
        try:
            init_db()
            db_gen = get_db()
            db_init = next(db_gen)
            try:
                from models.base_location import Language
                if not db_init.query(Language).first():
                    db_init.add_all([
                        Language(code="en", name="English", is_active=True, display_order=1),
                        Language(code="te", name="Telugu", is_active=True, display_order=2),
                        Language(code="hi", name="Hindi", is_active=True, display_order=3),
                    ])
                    db_init.commit()
            except Exception as seed_err:
                db_init.rollback()
                logger.warning("Language auto-seed skipped: %s", seed_err)
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
        except Exception as e:
            logger.error("Auto table creation failed: %s", e)

    # 2. Start background schedulers
    try:
        start_notification_cleaner()
    except Exception as e:
        logger.error("Failed to start notification cleaner: %s", e)

    # 3. Initialize Rewards Module
    try:
        logger.info("Initializing Rewards Module...")
        db_gen = get_db()
        db = next(db_gen)
        try:
            from services.rewards_service import RewardsService
            rewards_service = RewardsService(db)
            rewards_service._init_referral_milestones()

            from services.bingo_service import BingoService
            bingo_service = BingoService(db)
            bingo_service._init_daily_challenge()
            logger.info("✅ Rewards Module initialized successfully!")
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass
    except Exception as e:
        logger.error("Error initializing rewards module: %s", e)

    yield

    # Shutdown
    logger.info("Shutting down %s...", settings.APP_NAME)


app = FastAPI(
    title="Hyperlocal News API", 
    version="2.0.0",
    description="News Platform with Rewards, Referrals, and Gamification",
    lifespan=lifespan
)

# =====================================================
# MIDDLEWARE (Order matters!)
# =====================================================

# 1. Security Headers & Request ID (outermost)
app.add_middleware(
    SecurityHeadersMiddleware,
    secret_key=settings.SECRET_KEY
)

# 2. Session Middleware (required for Google OAuth)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY,
    same_site="lax",
    https_only=is_production
)

# 3. Query normalization middleware (normalize query params before validation)
app.add_middleware(QueryNormalizationMiddleware)

# 4. Rate Limit Middleware (add before CORS)
app.add_middleware(RateLimitMiddleware)

# 5. CORS Middleware (last)
if is_production:
    allowed_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    allowed_headers = ["Content-Type", "Authorization", "Accept", "X-Request-ID"]
else:
    allowed_methods = ["*"]
    allowed_headers = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
)


# =====================================================
# ROUTERS (Cleaned: no duplicate prefixes)
# =====================================================

app.include_router(base_location_routes.router, tags=["Base Location"])
app.include_router(user_routes.router, tags=["User"])
app.include_router(news_routes.router, tags=["News"])
app.include_router(news_routes.router, prefix="/news", tags=["News"])
app.include_router(content_routes.router, tags=["Content"])
app.include_router(engagement_routes.router, prefix="/engagement", tags=["Engagement"])
app.include_router(admin_routes.router, tags=["Admin"])
app.include_router(insights_router.router, tags=["Insights"])
app.include_router(admin_settings_routes.router, tags=["Admin Settings"])
app.include_router(category_routes.router, tags=["Category"])
app.include_router(notification_routes.router, tags=["Notifications"])
app.include_router(discovery_routes.router, tags=["Discovery"])
app.include_router(rewards_routes.router, tags=["Rewards"])
app.include_router(user_activity_routes.router, tags=["User Activity"])
app.include_router(post_routes.router, tags=["Posts"])
app.include_router(follow_routes.router, tags=["Follow"])
app.include_router(short_routes.router, tags=["Shorts"])



# =====================================================
# HEALTH CHECK ENDPOINT (Enhanced)
# =====================================================

@app.get("/health", tags=["System"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint for deployment monitoring"""
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "2.0.0",
        "services": {
            "api": "running",
            "database": db_status,
            "auth": "active",
            "users": "active",
            "news": "active",
            "content": "active",
            "engagement": "active",
            "guest": "active",
            "admin": "active",
            "insights": "active",
            "categories": "active",
            "notifications": "active",
            "user_activity": "active",
            "rewards": "active",
            "referrals": "active",
            "bingo": "active"
        },
    }


@app.get("/ready", tags=["System"])
def readiness_check(db: Session = Depends(get_db)):
    """Readiness probe for Kubernetes / container orchestrators"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database not ready: {exc}")


# =====================================================
# ROOT ENDPOINT
# =====================================================

@app.get("/", response_class=HTMLResponse)
def root():
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HyperNews API</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg-ink: #0b1020;
                --bg-deep: #111a33;
                --bg-warm: #1e243d;
                --card: #f7f4ef;
                --card-strong: #f1ece4;
                --ink: #12131a;
                --muted: #4a5166;
                --brand: #f97316;
                --brand-dark: #ea580c;
                --accent: #14b8a6;
                --accent-dark: #0f766e;
                --line: rgba(18, 19, 26, 0.08);
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: "Source Sans 3", system-ui, -apple-system, sans-serif;
                background: radial-gradient(1200px 600px at 10% 0%, #2a3563 0%, transparent 60%),
                            radial-gradient(900px 500px at 90% 20%, #2a4f4a 0%, transparent 55%),
                            linear-gradient(135deg, var(--bg-ink) 0%, var(--bg-deep) 45%, var(--bg-warm) 100%);
                color: var(--ink);
                min-height: 100vh;
                padding: 32px 20px 60px;
            }

            .frame {
                max-width: 1080px;
                margin: 0 auto;
                display: grid;
                gap: 24px;
            }

            .hero {
                background: var(--card);
                border-radius: 24px;
                padding: 40px 40px 32px;
                box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
                position: relative;
                overflow: hidden;
                animation: float-in 600ms ease-out;
            }

            .hero::after {
                content: "";
                position: absolute;
                inset: 0;
                background: linear-gradient(120deg, rgba(249, 115, 22, 0.12), rgba(20, 184, 166, 0.12));
                pointer-events: none;
            }

            .hero-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 16px;
                flex-wrap: wrap;
            }

            .tag {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                border-radius: 999px;
                background: rgba(249, 115, 22, 0.12);
                color: #9a3412;
                font-weight: 600;
                font-size: 12px;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }

            .status {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 6px 12px;
                border-radius: 999px;
                background: rgba(20, 184, 166, 0.14);
                color: #0f766e;
                font-weight: 600;
                font-size: 12px;
            }

            h1 {
                font-family: "Space Grotesk", sans-serif;
                font-size: 36px;
                line-height: 1.1;
                margin-top: 20px;
                color: #0f172a;
                letter-spacing: -0.02em;
            }

            .subtitle {
                margin-top: 10px;
                color: var(--muted);
                font-size: 16px;
                max-width: 720px;
            }

            .actions {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 22px;
            }

            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 12px 18px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: 600;
                transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
            }

            .btn-primary {
                background: var(--brand);
                color: white;
                box-shadow: 0 10px 20px rgba(249, 115, 22, 0.35);
            }

            .btn-primary:hover {
                background: var(--brand-dark);
                transform: translateY(-2px);
            }

            .btn-secondary {
                background: var(--accent);
                color: white;
                box-shadow: 0 10px 20px rgba(20, 184, 166, 0.3);
            }

            .btn-secondary:hover {
                background: var(--accent-dark);
                transform: translateY(-2px);
            }

            .btn-ghost {
                background: rgba(18, 19, 26, 0.06);
                color: #1f2937;
            }

            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 18px;
            }

            .card {
                background: var(--card-strong);
                border-radius: 18px;
                padding: 18px 18px 16px;
                border: 1px solid var(--line);
                box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
                animation: rise 700ms ease both;
            }

            .card h3 {
                font-family: "Space Grotesk", sans-serif;
                font-size: 16px;
                margin-bottom: 10px;
                color: #111827;
            }

            .card ul {
                list-style: none;
                display: grid;
                gap: 6px;
                color: var(--muted);
                font-size: 14px;
            }

            .card li::before {
                content: "- ";
                color: #64748b;
            }

            .footer {
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
                text-align: center;
                padding-top: 8px;
            }

            @keyframes float-in {
                from { opacity: 0; transform: translateY(14px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @keyframes rise {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
            }

            @media (max-width: 700px) {
                h1 { font-size: 28px; }
                .hero { padding: 28px; }
            }
        </style>
    </head>
    <body>
        <div class="frame">
            <section class="hero">
                <div class="hero-top">
                    <span class="tag">HyperNews API v2.0</span>
                    <span class="status">Server running</span>
                </div>
                <h1>News platform backend with content, engagement, rewards, and security.</h1>
                <p class="subtitle">Full stack of features beyond rewards and gamification: editorial workflows, geo targeting, guest flows, notifications, and user activity auditing.</p>
                <div class="actions">
                    <a href="/docs" class="btn btn-primary">Open API docs</a>
                    <a href="/openapi.json" class="btn btn-ghost">OpenAPI JSON</a>
                    <a href="/health" class="btn btn-secondary">System health</a>
                </div>
            </section>

            <section class="grid">
                <div class="card" style="animation-delay: 80ms;">
                    <h3>Core content</h3>
                    <ul>
                        <li>News creation, approval, and moderation</li>
                        <li>Categories, tags, and search</li>
                        <li>Insights stories and pages</li>
                        <li>Scheduled and expiring content</li>
                    </ul>
                </div>
                <div class="card" style="animation-delay: 140ms;">
                    <h3>Users and access</h3>
                    <ul>
                        <li>Auth, roles, and admin controls</li>
                        <li>User preferences and profiles</li>
                        <li>Guest onboarding flows</li>
                        <li>Suspensions and audits</li>
                    </ul>
                </div>
                <div class="card" style="animation-delay: 200ms;">
                    <h3>Engagement</h3>
                    <ul>
                        <li>Likes, comments, shares, bookmarks</li>
                        <li>Views, reactions, and analytics</li>
                        <li>Notifications and admin broadcasts</li>
                        <li>Health checks for each domain</li>
                    </ul>
                </div>
                <div class="card" style="animation-delay: 260ms;">
                    <h3>Rewards and gamification</h3>
                    <ul>
                        <li>Points and coins economy</li>
                        <li>Daily challenges and bingo</li>
                        <li>Referrals and milestones</li>
                        <li>Badges and leaderboards</li>
                    </ul>
                </div>
                <div class="card" style="animation-delay: 320ms;">
                    <h3>Geo and discovery</h3>
                    <ul>
                        <li>States, districts, cities, languages</li>
                        <li>Location-based filtering</li>
                        <li>Trending and analytics endpoints</li>
                        <li>Scheduler-driven cleanup</li>
                    </ul>
                </div>
                <div class="card" style="animation-delay: 380ms;">
                    <h3>Security and activity</h3>
                    <ul>
                        <li>Session tracking and device limits</li>
                        <li>Activity logs and audit trails</li>
                        <li>Fraud signals and suspicious events</li>
                        <li>Rate limiting middleware</li>
                    </ul>
                </div>
            </section>

            <div class="footer">HyperNews API - 2026</div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)


# =====================================================
# EXCEPTION HANDLERS
# =====================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with request tracking"""
    request_id = getattr(request.state, "request_id", None)
    logger.warning(f"HTTP {exc.status_code}: {exc.detail} | Path: {request.url.path} | RequestID: {request_id}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": True,
            "status_code": exc.status_code,
            "detail": exc.detail,
            "path": request.url.path,
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        headers=getattr(exc, "headers", None)
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions safely without leaking internal traces"""
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"Unhandled Exception: {str(exc)} | RequestID: {request_id}", exc_info=True)
    
    detail = str(exc) if os.getenv("ENVIRONMENT") != "production" else "Internal server error"
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": True,
            "status_code": 500,
            "detail": detail,
            "path": request.url.path,
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


# =====================================================
# REWARDS MODULE INFO ENDPOINT
# =====================================================

@app.get("/api/v1/rewards/info", tags=["Rewards"])
async def rewards_info():
    """Get information about rewards system"""
    from config.rewards_config import RewardsConfig
    
    return {
        "module": "Rewards & Gamification",
        "version": "1.0.0",
        "features": {
            "points_system": True,
            "coins_system": True,
            "levels": len(RewardsConfig.LEVEL_THRESHOLDS),
            "badges": len(RewardsConfig.BADGES),
            "bingo_size": "5x5",
            "referral_milestones": list(RewardsConfig.REFERRAL_MILESTONES.keys()),
            "daily_challenge": True,
            "streak_bonus": True,
            "ad_rewards": True,
            "vouchers": True
        },
        "conversion_rates": {
            "coins_to_rupee": f"1 INR = {RewardsConfig.COINS_PER_RUPEE} coins",
            "min_withdrawal": f"{RewardsConfig.MIN_WITHDRAWAL} coins (₹{RewardsConfig.MIN_WITHDRAWAL / RewardsConfig.COINS_PER_RUPEE})"
        },
        "earning_rates": {
            "read_article": f"{RewardsConfig.READ_ARTICLE_POINTS} points",
            "share_article": f"{RewardsConfig.SHARE_ARTICLE_POINTS} points + {RewardsConfig.SHARE_ARTICLE_COINS} coins",
            "daily_login": f"{RewardsConfig.DAILY_LOGIN_POINTS} points + {RewardsConfig.DAILY_LOGIN_COINS} coins",
            "rewarded_ad": f"{RewardsConfig.REWARDED_AD_COINS} coins",
            "referral": f"{RewardsConfig.REFERRAL_SIGNUP_POINTS} points + {RewardsConfig.REFERRAL_SIGNUP_COINS} coins"
        }
    }


# =====================================================
# RUN APPLICATION (if executed directly)
# =====================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=not is_production,
        log_level="info"
    )