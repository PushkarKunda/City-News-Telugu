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


def test_google_login_new_user_and_me_endpoint(client: TestClient, monkeypatch):
    """Test fresh Google sign-in stores provider info and returns in login and /me endpoint."""
    fake_firebase_user = {
        "uid": "firebase_goog_123",
        "user_id": "firebase_goog_123",
        "phone_number": None,
        "phone_number_verified": False,
        "email": "newgoogleuser@example.com",
        "email_verified": True,
        "name": "Google User",
        "picture": "https://example.com/pic.jpg",
        "sign_in_provider": "google.com",
        "google_id": "google_sub_987654",
        "providers": ["google"],
        "firebase": {"sign_in_provider": "google.com"},
        "is_verified": True
    }
    monkeypatch.setattr("routes.user_routes.verify_firebase_token", lambda token: fake_firebase_user)

    login_res = client.post("/user/auth/firebase/login", json={"firebase_token": "valid_token"})
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["success"] is True
    user_data = data["user"]
    assert user_data["google_id"] == "google_sub_987654"
    assert user_data["auth_provider"] == "google"
    assert "google" in user_data["providers"]
    assert user_data["is_google_linked"] is True
    assert user_data["email"] == "newgoogleuser@example.com"
    assert user_data["email_verified"] is True
    assert user_data["email_verified_at"] is not None

    # Test /me endpoint returns provider fields and verified status
    token = data["access_token"]
    me_res = client.get("/user/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["google_id"] == "google_sub_987654"
    assert me_data["auth_provider"] == "google"
    assert "google" in me_data["providers"]
    assert me_data["is_google_linked"] is True
    assert me_data["email_verified"] is True
    assert me_data["email_verified_at"] is not None


def test_existing_email_user_links_google_without_duplicate(client: TestClient, db: Session, regular_user: User, monkeypatch):
    """Test existing user with email signs in with Google; accounts merge, Google provider is attached, marked verified."""
    user_email = regular_user.email
    original_uid = regular_user.user_uid
    # Ensure regular_user starts unverified
    regular_user.email_verified = False
    regular_user.email_verified_at = None
    db.commit()

    fake_firebase_user = {
        "uid": "firebase_goog_456",
        "user_id": "firebase_goog_456",
        "phone_number": None,
        "phone_number_verified": False,
        "email": user_email,
        "email_verified": True,
        "name": "Google Linked Name",
        "picture": "https://example.com/pic2.jpg",
        "sign_in_provider": "google.com",
        "google_id": "google_sub_112233",
        "providers": ["google"],
        "firebase": {"sign_in_provider": "google.com"},
        "is_verified": True
    }
    monkeypatch.setattr("routes.user_routes.verify_firebase_token", lambda token: fake_firebase_user)

    login_res = client.post("/user/auth/firebase/login", json={"firebase_token": "valid_token_2"})
    assert login_res.status_code == 200
    data = login_res.json()
    user_data = data["user"]
    # Must be the SAME user UID, not a new user
    assert user_data["user_uid"] == original_uid
    assert user_data["google_id"] == "google_sub_112233"
    assert "google" in user_data["providers"]
    assert user_data["is_google_linked"] is True
    assert user_data["email_verified"] is True
    assert user_data["email_verified_at"] is not None

    # Check database directly
    db.refresh(regular_user)
    assert regular_user.google_id == "google_sub_112233"
    assert regular_user.is_google_linked is True
    assert "google" in regular_user.provider_list
    assert regular_user.email_verified is True
    assert regular_user.email_verified_at is not None

    # Check publisher eligibility does not complain about email
    token = data["access_token"]
    elig_res = client.get("/user/users/me/publisher-eligibility", headers={"Authorization": f"Bearer {token}"})
    assert elig_res.status_code == 200
    elig_data = elig_res.json()
    missing_fields = [m["field"] for m in elig_data["missing_requirements"]]
    assert "email" not in missing_fields


def test_sync_provider_endpoint(client, db, monkeypatch):
    """
    Test POST /user/auth/sync-provider syncs Google provider and marks email verified.
    """
    from services import firebase_auth
    fake_payload = {
        "uid": "fb_sync_uid_99",
        "email": "syncuser@gmail.com",
        "email_verified": True,
        "phone_number": None,
        "name": "Sync User",
        "picture": "https://example.com/pic.png",
        "sign_in_provider": "google.com",
        "google_id": "google_sync_id_999",
        "providers": ["google"],
        "decoded_token": {
            "uid": "fb_sync_uid_99",
            "email": "syncuser@gmail.com",
            "email_verified": True,
            "firebase": {
                "sign_in_provider": "google.com",
                "identities": {
                    "google.com": ["google_sync_id_999"]
                }
            }
        },
        "is_verified": True
    }
    monkeypatch.setattr("routes.user_routes.verify_firebase_token", lambda tok: fake_payload)
    monkeypatch.setattr(firebase_auth, "verify_firebase_token", lambda tok: fake_payload)

    # 1. Call sync-provider with Authorization header
    res = client.post("/user/auth/sync-provider", headers={"Authorization": "Bearer fake_token_123"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    user_info = data["user"]
    assert user_info["email"] == "syncuser@gmail.com"
    assert user_info["google_id"] == "google_sync_id_999"
    assert user_info["auth_provider"] == "google"
    assert "google" in user_info["providers"]
    assert user_info["email_verified"] is True
    assert user_info["is_google_linked"] is True

    # 2. Verify /users/me returns the updated provider state
    token = data["access_token"]
    me_res = client.get("/user/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200, me_res.text
    me_data = me_res.json()
    assert me_data["google_id"] == "google_sync_id_999"
    assert me_data["auth_provider"] == "google"
    assert "google" in me_data["providers"]
    assert me_data["email_verified"] is True
    assert me_data["is_google_linked"] is True


def test_sync_provider_existing_user_and_publisher_eligibility(client, db, monkeypatch):
    """
    Test that an existing unverified user (e.g. sujanakorupolu319@gmail.com) gets updated on sync-provider,
    and their publisher eligibility reflects can_apply=True and filtered_missing=[].
    """
    from services import firebase_auth
    from models.user import User

    # Create existing unverified user with completed profile fields
    from datetime import date
    existing = User(
        user_uid="SUJANA_UID_123",
        user_name="sujanak",
        name="Sujana Korupolu",
        email="sujanakorupolu319@gmail.com",
        phone="+919876543210",
        mobile_verified=True,
        email_verified=False,
        email_verified_at=None,
        google_id=None,
        auth_provider=None,
        providers=None,
        date_of_birth=date(1995, 5, 15),
        gender="female",
        role=1
    )
    db.add(existing)
    db.commit()

    fake_payload = {
        "uid": "fb_sujana_uid",
        "email": "sujanakorupolu319@gmail.com",
        "email_verified": True,
        "phone_number": "+919876543210",
        "name": "Sujana Korupolu",
        "picture": "https://example.com/pic.png",
        "sign_in_provider": "google.com",
        "google_id": "google_sujana_id_777",
        "providers": ["google"],
        "decoded_token": {
            "uid": "fb_sujana_uid",
            "email": "sujanakorupolu319@gmail.com",
            "email_verified": True,
            "firebase": {
                "sign_in_provider": "google.com",
                "identities": {
                    "google.com": ["google_sujana_id_777"]
                }
            }
        },
        "is_verified": True
    }
    monkeypatch.setattr("routes.user_routes.verify_firebase_token", lambda tok: fake_payload)
    monkeypatch.setattr(firebase_auth, "verify_firebase_token", lambda tok: fake_payload)

    # Sync provider
    res = client.post("/user/auth/sync-provider", headers={"Authorization": "Bearer token_sujana_123"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    u_info = data["user"]
    assert u_info["google_id"] == "google_sujana_id_777"
    assert u_info["auth_provider"] == "google"
    assert "google" in u_info["providers"]
    assert u_info["email_verified"] is True
    assert u_info["is_google_linked"] is True

    # Check publisher eligibility
    access_token = data["access_token"]
    pub_res = client.get("/user/publisher/status", headers={"Authorization": f"Bearer {access_token}"})
    assert pub_res.status_code == 200, pub_res.text
    pub_data = pub_res.json()
    assert pub_data["can_apply"] is True
    assert pub_data["is_eligible"] is True
    assert pub_data["filtered_missing"] == []
    assert pub_data["completed_requirements"]["email_verified"] is True



