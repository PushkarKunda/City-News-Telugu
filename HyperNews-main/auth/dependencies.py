# auth/dependencies.py
"""
Authentication and Authorization Dependencies for HyperNews API.
Implements:
- JWT Access token validation with suspension & revocation checks
- Declarative Permission-based RBAC dependencies
- Object-level authorization helpers (preventing IDOR)
- Backward-compatible role dependencies
"""
from datetime import datetime, timezone
from typing import List, Optional, Union
import logging

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from auth.jwt_handler import SECRET_KEY, ALGORITHM, decode_token
from auth.rbac import (
    Permission, Role, get_role_from_value, user_has_permission, user_has_any_permission
)
from schemas import UserRole

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/user/auth/login",
    auto_error=True
)

oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/user/auth/login",
    auto_error=False
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts and validates the current user from the JWT access token.
    Validates signature, expiration, user existence, token revocation version,
    and account suspension state.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials or token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token, expected_type="access")
        user_uid: Optional[str] = payload.get("sub")
        token_version: int = payload.get("ver", 0)

        if not user_uid:
            raise credentials_error

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired. Please refresh your token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, JWTClaimsError) as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise credentials_error

    # Validate user exists in database
    user = db.query(User).filter(User.user_uid == user_uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or account deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check token revocation version
    if user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check account suspension
    if user.is_suspended:
        now = datetime.now(timezone.utc)
        suspended_until = user.suspended_until
        if suspended_until:
            if suspended_until.tzinfo is None:
                suspended_until = suspended_until.replace(tzinfo=timezone.utc)

            if suspended_until > now:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Account is suspended until {suspended_until.strftime('%Y-%m-%d %H:%M UTC')}. Reason: {user.suspension_reason or 'Policy violation'}"
                )
            else:
                # Auto-unsuspend if suspension period has expired
                user.is_suspended = False
                user.suspended_at = None
                user.suspended_until = None
                db.commit()
                logger.info("Auto-unsuspended user %s after expiration", user.user_uid)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is permanently suspended. Reason: {user.suspension_reason or 'Policy violation'}"
            )

    return user


def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Return User if valid token is provided, otherwise None without failing."""
    if not token:
        return None
    try:
        return get_current_user(token=token, db=db)
    except HTTPException:
        return None


def get_current_user_uid(current_user: User = Depends(get_current_user)) -> str:
    """Helper returning current user's UID."""
    return current_user.user_uid


# =============================================================================
# Permission-Based Dependencies (Declarative RBAC)
# =============================================================================

def require_permission(permission: Permission):
    """
    FastAPI dependency enforcing that the current user possesses a specific permission.
    Example:
        @router.post("/news/publish")
        def publish(user: User = Depends(require_permission(Permission.NEWS_PUBLISH))):
            ...
    """
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not user_has_permission(current_user.role, permission):
            role_enum = get_role_from_value(current_user.role)
            logger.warning(
                "Access denied for user %s with role %s (needed %s)",
                current_user.user_uid, role_enum.value, permission.value
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required permission: '{permission.value}'. Current role: '{role_enum.value}'"
            )
        return current_user

    return permission_checker


def require_any_permission(permissions: List[Permission]):
    """Enforce that the current user has at least one of the listed permissions."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not user_has_any_permission(current_user.role, permissions):
            role_enum = get_role_from_value(current_user.role)
            required_perm_names = [p.value for p in permissions]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required one of: {required_perm_names}. Current role: '{role_enum.value}'"
            )
        return current_user

    return permission_checker


# =============================================================================
# Object-Level Authorization & IDOR Protection
# =============================================================================

def check_object_permission(
    current_user: User,
    owner_uid: str,
    override_permission: Permission
) -> bool:
    """
    Prevents Insecure Direct Object References (IDOR).
    Returns True if the current user is the owner of the object, OR
    possesses the override permission (e.g. admin or moderator).
    """
    if current_user.user_uid == owner_uid:
        return True
    if user_has_permission(current_user.role, override_permission):
        return True
    return False


def enforce_object_permission(
    current_user: User,
    owner_uid: str,
    override_permission: Permission,
    resource_name: str = "resource"
) -> None:
    """Raises HTTP 403 if the user neither owns the resource nor has override permission."""
    if not check_object_permission(current_user, owner_uid, override_permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: You do not have permission to modify or access this {resource_name}."
        )


# =============================================================================
# Backward Compatible Role Dependencies
# =============================================================================

def require_roles(allowed_roles: List[Union[UserRole, Role, int]]):
    """Legacy support for allowed_roles list."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role_enum = get_role_from_value(current_user.role)
        allowed_enums = [get_role_from_value(r) for r in allowed_roles]
        if user_role_enum not in allowed_enums and user_role_enum not in (Role.ADMIN, Role.SUPER_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Allowed roles: {[r.value for r in allowed_enums]}. Current role: '{user_role_enum.value}'"
            )
        return current_user

    return role_checker


def require_role(role: Union[UserRole, Role, int]):
    """Legacy single-role checker (hierarchical or exact)."""
    return require_roles([role])


def admin_required(current_user: User = Depends(get_current_user)) -> User:
    """Convenience dependency for Admin or Super Admin privileges."""
    user_role_enum = get_role_from_value(current_user.role)
    if user_role_enum not in (Role.ADMIN, Role.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required."
        )
    return current_user


def admin_or_employee_required(current_user: User = Depends(get_current_user)) -> User:
    """Convenience dependency for Admin, Super Admin, or Editor/Employee privileges."""
    user_role_enum = get_role_from_value(current_user.role)
    if user_role_enum not in (Role.ADMIN, Role.SUPER_ADMIN, Role.EDITOR, Role.NEWS_EDITOR, Role.CONTENT_MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator or Editor/Employee privileges required."
        )
    return current_user


def moderator_required(current_user: User = Depends(get_current_user)) -> User:
    """Convenience dependency for Moderator, Editor, or Admin."""
    user_role_enum = get_role_from_value(current_user.role)
    if user_role_enum not in (Role.MODERATOR, Role.NEWS_EDITOR, Role.EDITOR, Role.CONTENT_MANAGER, Role.ADMIN, Role.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator or higher privileges required."
        )
    return current_user


def publisher_required(current_user: User = Depends(get_current_user)) -> User:
    """Convenience dependency for Publisher, Reporter, or higher."""
    return require_permission(Permission.NEWS_CREATE)(current_user)


def can_modify_content(user: User, content_owner_uid: str) -> bool:
    """Helper checking if user can modify content (owner or moderator/admin)."""
    return check_object_permission(user, content_owner_uid, Permission.NEWS_UPDATE)


def can_delete_content(user: User, content_owner_uid: str) -> bool:
    """Helper checking if user can delete content (owner or admin)."""
    return check_object_permission(user, content_owner_uid, Permission.NEWS_DELETE)


def can_approve_content(user: User) -> bool:
    """Helper checking if user can approve content."""
    return user_has_permission(user.role, Permission.NEWS_PUBLISH)