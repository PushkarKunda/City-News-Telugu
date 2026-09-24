# tests/test_auth.py
import pytest
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from models.user import User, UserRole
from auth.jwt_handler import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    create_password_reset_token,
)


def test_password_hashing():
    """Verify password hashing generates unique hashes and validates correctly."""
    plain = "SuperSecurePassword123!"
    h1 = hash_password(plain)
    h2 = hash_password(plain)

    assert h1 != h2  # Salt ensures uniqueness
    assert verify_password(plain, h1) is True
    assert verify_password("WrongPassword!", h1) is False
    assert verify_password(plain, h2) is True


def test_jwt_token_generation_and_claims():
    """Verify access token contains expected claims including subject, role, and version."""
    payload_data = {"sub": "user_123", "role": 1}
    token = create_access_token(data=payload_data, token_version=2)

    decoded = verify_token(token)
    assert decoded["sub"] == "user_123"
    assert decoded["role"] == 1
    assert decoded["ver"] == 2
    assert decoded["type"] == "access"
    assert "exp" in decoded


def test_refresh_token_claims():
    """Verify refresh token has type 'refresh'."""
    payload_data = {"sub": "user_123"}
    token = create_refresh_token(data=payload_data, token_version=5)

    decoded = verify_token(token)
    assert decoded["sub"] == "user_123"
    assert decoded["ver"] == 5
    assert decoded["type"] == "refresh"


def test_token_version_revocation(client: TestClient, db: Session, regular_user: User):
    """Verify that incrementing user.token_version revokes existing access tokens."""
    token = create_access_token(
        data={"sub": regular_user.user_uid, "role": regular_user.role},
        token_version=regular_user.token_version
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Request succeeds with current token version
    res = client.get("/user/users/me", headers=headers)
    assert res.status_code == 200

    # Invalidate tokens by bumping token_version
    regular_user.token_version += 1
    db.commit()

    # Same token must now be rejected with 401 Unauthorized
    res_after = client.get("/user/users/me", headers=headers)
    assert res_after.status_code == 401
    assert "revoked" in res_after.json()["detail"].lower()


def test_refresh_token_rotation(client: TestClient, db: Session, regular_user: User):
    """Verify refresh token endpoint returns new access and refresh tokens."""
    refresh_tok = create_refresh_token(
        data={"sub": regular_user.user_uid, "role": regular_user.role},
        token_version=regular_user.token_version
    )

    res = client.post("/user/auth/refresh", json={"refresh_token": refresh_tok})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_refresh_token_rejects_access_token(client: TestClient, regular_user: User):
    """Providing an access token to the refresh endpoint should be rejected."""
    access_tok = create_access_token(
        data={"sub": regular_user.user_uid, "role": regular_user.role},
        token_version=regular_user.token_version
    )

    res = client.post("/user/auth/refresh", json={"refresh_token": access_tok})
    assert res.status_code == 401
    assert "invalid token type" in res.json()["detail"].lower()


def test_logout_revokes_token(client: TestClient, user_headers: dict, regular_user: User, db: Session):
    """Logout endpoint must invalidate active tokens by incrementing token_version."""
    orig_version = regular_user.token_version

    res = client.post("/user/auth/logout", headers=user_headers)
    assert res.status_code == 200

    db.refresh(regular_user)
    assert regular_user.token_version > orig_version

    # Subsequent request using the old token header must fail
    res_after = client.get("/user/users/me", headers=user_headers)
    assert res_after.status_code == 401


def test_password_reset_flow(client: TestClient, db: Session, regular_user: User):
    """Test full password reset workflow: request, token confirmation, login."""
    # 1. Request reset
    res = client.post("/user/auth/password-reset/request", json={"identifier": regular_user.email})
    assert res.status_code == 200
    assert "reset_token" in res.json()
    reset_token = res.json()["reset_token"]

    # 2. Confirm reset
    new_pass = "BrandNewSecurePass999!"
    confirm_res = client.post(
        "/user/auth/password-reset/confirm",
        json={"token": reset_token, "new_password": new_pass}
    )
    assert confirm_res.status_code == 200

    # 3. Verify user's new password hash
    db.refresh(regular_user)
    assert verify_password(new_pass, regular_user.password_hash) is True
    assert verify_password("OldPassword123!", regular_user.password_hash) is False


def test_suspended_user_blocked(client: TestClient, suspended_user: User):
    """Verify that suspended users cannot access protected APIs."""
    token = create_access_token(
        data={"sub": suspended_user.user_uid, "role": suspended_user.role},
        token_version=suspended_user.token_version
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/user/users/me", headers=headers)
    assert res.status_code == 403
    assert "suspended" in res.json()["detail"].lower()
