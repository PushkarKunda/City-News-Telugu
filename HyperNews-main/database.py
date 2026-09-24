import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import make_url
from sqlalchemy.pool import QueuePool

# Setup logging
logger = logging.getLogger(__name__)

# Load environment variables without overriding real environment values
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=False)

# Environment detection
_is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
_is_testing = os.getenv("ENVIRONMENT", "development").lower() == "testing"

# Get database URL from settings or environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if _is_production:
        raise RuntimeError("DATABASE_URL must be set in production")
    elif _is_testing:
        DATABASE_URL = "sqlite:///:memory:"
    else:
        DATABASE_URL = "sqlite:///./hypernews_dev.db"
        logger.warning("DATABASE_URL not set; falling back to local SQLite: %s", DATABASE_URL)

_is_sqlite = DATABASE_URL.startswith("sqlite")
_db_url = make_url(DATABASE_URL)
_db_host = _db_url.host or ("sqlite" if _is_sqlite else "unknown")
_db_name = _db_url.database or "unknown"
logger.info("Database target: host=%s db=%s", _db_host, _db_name)

# Connection pool settings
if _is_production and not _is_sqlite:
    # Production settings (Postgres optimized)
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=5,              # Number of connections to keep in pool
        max_overflow=10,          # Extra connections during peak
        pool_timeout=30,          # Timeout for getting connection from pool
        pool_recycle=1800,        # Recycle connections after 30 minutes
        pool_pre_ping=True,       # Verify connection before using
        echo=False,               # Disable SQL logging in production
    )
elif _is_sqlite:
    from sqlalchemy.pool import StaticPool
    connect_args = {"check_same_thread": False}
    if DATABASE_URL == "sqlite:///:memory:":
        engine = create_engine(
            DATABASE_URL,
            connect_args=connect_args,
            poolclass=StaticPool,
            echo=False
        )
    else:
        engine = create_engine(
            DATABASE_URL,
            connect_args=connect_args,
            echo=False
        )
else:
    # Development Postgres settings
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=1800,
        echo=False,
    )

# Log connection pool status (for debugging)
@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Log when a connection is checked out from the pool"""
    if _is_production and not _is_sqlite:
        if all(hasattr(engine.pool, attr) for attr in ("size", "checkedin", "checkedout", "overflow")):
            logger.debug(
                "Pool status - Size: %s, Checked in: %s, Checked out: %s, Overflow: %s",
                engine.pool.size(),
                engine.pool.checkedin(),
                engine.pool.checkedout(),
                engine.pool.overflow(),
            )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def init_db() -> None:
    """
    Initialize database tables.
    DISABLED in production - use Alembic migrations instead.
    """
    if _is_production:
        logger.warning("init_db() is disabled in production; run Alembic migrations instead")
        return
    
    try:
        # Import all model modules so SQLAlchemy can register every table
        from models import (  # noqa: F401
            base_location, content, engagement, insorts, news, settings, user,
            monetization, source, audit, rewards, shorts, post, follow, user_activity
        )
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {str(e)}")
        raise


def get_db():
    """
    Dependency for FastAPI endpoints.
    Yields a database session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()  # Rollback on error
        raise
    finally:
        db.close()


def get_db_session():
    """
    Context manager for manual database session management.
    Usage:
        with get_db_session() as db:
            db.query(User).all()
    """
    from contextlib import contextmanager
    
    @contextmanager
    def _get_db_session():
        db = SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    
    return _get_db_session()


def check_db_connection() -> bool:
    """
    Health check function to verify database connectivity.
    Returns True if connection is successful, False otherwise.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {str(e)}")
        return False


def get_pool_status() -> dict:
    """
    Get connection pool status for monitoring.
    Returns dictionary with pool statistics.
    """
    if hasattr(engine.pool, "status"):
        return engine.pool.status()
    return {
        "size": 0,
        "checkedin": 0,
        "checkedout": 0,
        "overflow": 0,
        "total": 0
    }