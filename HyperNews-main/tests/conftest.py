# tests/conftest.py
import os
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

# Set testing environment before importing app
os.environ["IS_TESTING"] = "True"
os.environ["ENVIRONMENT"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-at-least-32-chars-long-for-security"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from database import Base, get_db
import models  # Register all models
from models.user import User, UserPreference, UserRole
from models.base_location import Language, State, District, City
from models.news import Category, News
from auth.jwt_handler import create_access_token, create_refresh_token, hash_password
from main import app

# Create in-memory SQLite engine
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Create all tables and seed required reference data once for the test session."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    db = TestingSessionLocal()

    try:
        # Seed Languages
        lang_en = Language(id=1, code="en", name="English", is_active=True)
        lang_te = Language(id=2, code="te", name="Telugu", is_active=True)
        db.add_all([lang_en, lang_te])

        # Seed Locations
        state = State(id=1, name="Telangana", language_id=1)
        db.add(state)
        db.flush()

        district = District(id=1, name="Hyderabad", state_id=1)
        db.add(district)
        db.flush()

        city = City(id=1, name="Hyderabad", district_id=1)
        db.add(city)

        # Seed Categories
        cat_politics = Category(id=1, name="Politics", slug="politics", is_active=True)
        cat_tech = Category(id=2, name="Technology", slug="technology", is_active=True)
        db.add_all([cat_politics, cat_tech])

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture
def db():
    """Yields a database session that rolls back changes after each test."""
    connection = TEST_ENGINE.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db: Session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db: Session) -> User:
    """Create and return an admin user."""
    user = User(
        user_uid="admin_uid_001",
        user_name="superadmin",
        name="Super Admin",
        email="admin@hypernews.test",
        password_hash=hash_password("AdminPass123!"),
        role=UserRole.ADMIN,
        token_version=0,
        email_verified=True,
        mobile_verified=True,
        is_suspended=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def publisher_user(db: Session) -> User:
    """Create and return a publisher/reporter user."""
    user = User(
        user_uid="pub_uid_001",
        user_name="leadreporter",
        name="Lead Reporter",
        email="reporter@hypernews.test",
        password_hash=hash_password("ReporterPass123!"),
        role=UserRole.PUBLISHER,
        token_version=0,
        email_verified=True,
        mobile_verified=True,
        is_suspended=False,
        state_id=1,
        city_id=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db: Session) -> User:
    """Create and return a regular reader user."""
    user = User(
        user_uid="reader_uid_001",
        user_name="readerone",
        name="Regular Reader",
        email="reader@hypernews.test",
        password_hash=hash_password("ReaderPass123!"),
        role=UserRole.USER,
        token_version=0,
        email_verified=True,
        mobile_verified=False,
        is_suspended=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Add preferences
    pref = UserPreference(
        user_uid=user.user_uid,
        language_id=1,
        city_id=1,
        state_id=1,
        district_id=1,
    )
    db.add(pref)
    db.commit()
    return user


@pytest.fixture
def suspended_user(db: Session) -> User:
    """Create and return a suspended user."""
    user = User(
        user_uid="suspended_uid_001",
        user_name="banneduser",
        name="Banned User",
        email="banned@hypernews.test",
        password_hash=hash_password("BannedPass123!"),
        role=UserRole.USER,
        token_version=0,
        is_suspended=True,
        suspension_reason="Violation of Community Guidelines",
        suspended_until=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_headers(admin_user: User) -> dict:
    token = create_access_token(
        data={"sub": admin_user.user_uid, "role": admin_user.role},
        token_version=admin_user.token_version
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def publisher_headers(publisher_user: User) -> dict:
    token = create_access_token(
        data={"sub": publisher_user.user_uid, "role": publisher_user.role},
        token_version=publisher_user.token_version
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(regular_user: User) -> dict:
    token = create_access_token(
        data={"sub": regular_user.user_uid, "role": regular_user.role},
        token_version=regular_user.token_version
    )
    return {"Authorization": f"Bearer {token}"}
