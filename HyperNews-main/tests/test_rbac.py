# tests/test_rbac.py
import pytest
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from models.user import User, UserRole
from models.news import News
from auth.rbac import has_permission, get_role_permissions, Permission, Role


def test_permission_matrix_admin():
    """Admin must possess administrative, moderation, and user management permissions."""
    assert has_permission(Role.ADMIN, Permission.ADMIN_PANEL) is True
    assert has_permission(Role.ADMIN, Permission.USER_SUSPEND) is True
    assert has_permission(Role.ADMIN, Permission.NEWS_PUBLISH) is True
    assert has_permission(Role.ADMIN, Permission.NEWS_DELETE) is True


def test_permission_matrix_publisher():
    """Publisher can create and update news, but cannot access admin panel or suspend users."""
    assert has_permission(Role.PUBLISHER, Permission.NEWS_CREATE) is True
    assert has_permission(Role.PUBLISHER, Permission.NEWS_UPDATE) is True
    assert has_permission(Role.PUBLISHER, Permission.ADMIN_PANEL) is False
    assert has_permission(Role.PUBLISHER, Permission.USER_SUSPEND) is False


def test_permission_matrix_user():
    """Regular user cannot create news or access administrative APIs."""
    assert has_permission(Role.USER, Permission.NEWS_READ) is True
    assert has_permission(Role.USER, Permission.COMMENT_CREATE) is True
    assert has_permission(Role.USER, Permission.NEWS_CREATE) is False
    assert has_permission(Role.USER, Permission.ADMIN_PANEL) is False


def test_employee_alias_mapping():
    """Ensure UserRole.EMPLOYEE maps cleanly to EDITOR permissions."""
    assert has_permission(UserRole.EMPLOYEE, Permission.NEWS_CREATE) is True
    assert has_permission(UserRole.EMPLOYEE, Permission.NEWS_PUBLISH) is True


def test_admin_endpoint_forbidden_for_user(client: TestClient, user_headers: dict):
    """Regular users must receive 403 Forbidden when accessing admin endpoints."""
    res = client.get("/admin/dashboard", headers=user_headers)
    assert res.status_code == 403


def test_admin_endpoint_forbidden_for_publisher(client: TestClient, publisher_headers: dict):
    """Publishers must receive 403 Forbidden when accessing admin endpoints."""
    res = client.get("/admin/dashboard", headers=publisher_headers)
    assert res.status_code == 403


def test_admin_can_access_dashboard(client: TestClient, admin_headers: dict):
    """Admin must be authorized to access the admin dashboard."""
    res = client.get("/admin/dashboard", headers=admin_headers)
    assert res.status_code == 200


def test_idor_news_delete_prevention(client: TestClient, db: Session, publisher_user: User, regular_user: User, user_headers: dict):
    """A regular user must NOT be able to delete another user's news article (IDOR check)."""
    # Create news owned by publisher
    news = News(
        news_uid="test_idor_news_001",
        title="Valid Publisher News Article",
        summary="A comprehensive summary of the event that took place today in Hyderabad.",
        language_id=1,
        user_uid=publisher_user.user_uid,
        is_approved=1,
        is_duplicate=False,
    )
    db.add(news)
    db.commit()

    # Regular user attempts to delete publisher's news
    res = client.delete(f"/v1/user/news/{news.news_uid}", headers=user_headers)
    assert res.status_code == 403
    assert "unauthorized" in res.json()["detail"].lower()

    # Verify news is still in the database
    check = db.query(News).filter(News.news_uid == news.news_uid).first()
    assert check is not None


def test_admin_can_suspend_user(client: TestClient, db: Session, admin_headers: dict, regular_user: User):
    """Admin can suspend a regular user."""
    payload = {
        "duration_days": 7,
        "reason": "Repeated spam violations",
        "notify_user": False
    }
    res = client.post(f"/user/users/{regular_user.user_uid}/suspend", json=payload, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["is_suspended"] is True

    db.refresh(regular_user)
    assert regular_user.is_suspended is True
    assert regular_user.suspension_reason == "Repeated spam violations"
