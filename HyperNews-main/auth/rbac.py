# auth/rbac.py
"""
Role-Based Access Control (RBAC) and Permission Engine for HyperNews.
Provides:
1. Canonical Roles Enum
2. Granular Permissions Enum (resource:action)
3. Role -> Set[Permission] mapping
4. Declarative FastAPI dependency `require_permission`
5. Legacy integer-to-role compatibility mapping
"""
from enum import Enum
from typing import Set, Dict, List, Optional, Union
from fastapi import HTTPException, status, Depends


class Role(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    NEWS_EDITOR = "NEWS_EDITOR"
    CONTENT_MANAGER = "CONTENT_MANAGER"
    MODERATOR = "MODERATOR"
    AD_MANAGER = "AD_MANAGER"
    ANALYST = "ANALYST"
    PUBLISHER = "PUBLISHER"
    REPORTER = "REPORTER"
    VERIFIER = "VERIFIER"
    SUPPORT = "SUPPORT"
    USER = "USER"
    GUEST = "GUEST"


# Backward compatibility mapping for database integer roles
LEGACY_ROLE_MAP: Dict[int, Role] = {
    0: Role.GUEST,
    1: Role.USER,
    2: Role.PUBLISHER,
    3: Role.MODERATOR,
    4: Role.EDITOR,
    5: Role.ADMIN,
    6: Role.SUPER_ADMIN,
    7: Role.NEWS_EDITOR,
    8: Role.CONTENT_MANAGER,
    9: Role.AD_MANAGER,
    10: Role.ANALYST,
    11: Role.REPORTER,
    12: Role.VERIFIER,
    13: Role.SUPPORT,
}

REVERSE_LEGACY_ROLE_MAP: Dict[Role, int] = {v: k for k, v in LEGACY_ROLE_MAP.items()}


def get_role_from_value(role_val: Union[int, str, Role]) -> Role:
    """Safely convert stored user role (int or str) to Role enum."""
    if isinstance(role_val, Role):
        return role_val
    if isinstance(role_val, int):
        return LEGACY_ROLE_MAP.get(role_val, Role.USER)
    if isinstance(role_val, str):
        val_upper = role_val.upper()
        if val_upper == "EMPLOYEE":
            return Role.EDITOR
        try:
            return Role(val_upper)
        except ValueError:
            if role_val.isdigit():
                return LEGACY_ROLE_MAP.get(int(role_val), Role.USER)
            return Role.USER
    return Role.USER


class Permission(str, Enum):
    # News
    NEWS_CREATE = "news:create"
    NEWS_READ = "news:read"
    NEWS_UPDATE = "news:update"
    NEWS_DELETE = "news:delete"
    NEWS_PUBLISH = "news:publish"
    NEWS_UNPUBLISH = "news:unpublish"
    NEWS_IMPORT = "news:import"

    # Category
    CATEGORY_CREATE = "category:create"
    CATEGORY_READ = "category:read"
    CATEGORY_UPDATE = "category:update"
    CATEGORY_DELETE = "category:delete"

    # Users
    USER_READ = "user:read"
    USER_UPDATE = "user:update"
    USER_SUSPEND = "user:suspend"
    USER_DELETE = "user:delete"
    USER_ROLE_ASSIGN = "user:role_assign"

    # Advertisements
    ADS_CREATE = "ads:create"
    ADS_READ = "ads:read"
    ADS_UPDATE = "ads:update"
    ADS_APPROVE = "ads:approve"
    ADS_PAUSE = "ads:pause"
    ADS_DELETE = "ads:delete"

    # Sponsored Posts
    SPONSORED_CREATE = "sponsored:create"
    SPONSORED_READ = "sponsored:read"
    SPONSORED_UPDATE = "sponsored:update"
    SPONSORED_APPROVE = "sponsored:approve"
    SPONSORED_PUBLISH = "sponsored:publish"
    SPONSORED_DELETE = "sponsored:delete"

    # Moderation
    MODERATION_READ = "moderation:read"
    MODERATION_REVIEW = "moderation:review"

    # Sources & Ingestion
    SOURCE_READ = "source:read"
    SOURCE_CREATE = "source:create"
    SOURCE_UPDATE = "source:update"
    SOURCE_DELETE = "source:delete"
    SOURCE_INGEST = "source:ingest"

    # Analytics
    ANALYTICS_READ = "analytics:read"
    ANALYTICS_EXPORT = "analytics:export"

    # Audit Logs
    AUDIT_READ = "audit:read"

    # System & Settings
    SYSTEM_MANAGE = "system:manage"
    ADMIN_PANEL = "system:manage"
    SETTINGS_UPDATE = "settings:update"
    COMMENT_CREATE = "comment:create"


# Base user permissions
BASE_USER_PERMISSIONS: Set[Permission] = {
    Permission.NEWS_READ,
    Permission.CATEGORY_READ,
    Permission.ADS_READ,
    Permission.SPONSORED_READ,
    Permission.COMMENT_CREATE,
}

# Role to Permissions matrix
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.GUEST: {
        Permission.NEWS_READ,
        Permission.CATEGORY_READ,
        Permission.ADS_READ,
    },
    Role.USER: BASE_USER_PERMISSIONS | set(),
    Role.REPORTER: BASE_USER_PERMISSIONS | {
        Permission.NEWS_CREATE,
    },
    Role.PUBLISHER: BASE_USER_PERMISSIONS | {
        Permission.NEWS_CREATE,
        Permission.NEWS_UPDATE,
    },
    Role.VERIFIER: BASE_USER_PERMISSIONS | {
        Permission.MODERATION_READ,
        Permission.MODERATION_REVIEW,
        Permission.NEWS_READ,
    },
    Role.MODERATOR: BASE_USER_PERMISSIONS | {
        Permission.NEWS_CREATE,
        Permission.NEWS_UPDATE,
        Permission.NEWS_PUBLISH,
        Permission.NEWS_UNPUBLISH,
        Permission.MODERATION_READ,
        Permission.MODERATION_REVIEW,
    },
    Role.NEWS_EDITOR: BASE_USER_PERMISSIONS | {
        Permission.NEWS_CREATE,
        Permission.NEWS_UPDATE,
        Permission.NEWS_DELETE,
        Permission.NEWS_PUBLISH,
        Permission.NEWS_UNPUBLISH,
        Permission.NEWS_IMPORT,
        Permission.CATEGORY_READ,
        Permission.CATEGORY_CREATE,
        Permission.CATEGORY_UPDATE,
        Permission.MODERATION_READ,
        Permission.MODERATION_REVIEW,
        Permission.SOURCE_READ,
        Permission.SOURCE_INGEST,
    },
    Role.EDITOR: BASE_USER_PERMISSIONS | {
        Permission.NEWS_CREATE,
        Permission.NEWS_UPDATE,
        Permission.NEWS_DELETE,
        Permission.NEWS_PUBLISH,
        Permission.NEWS_UNPUBLISH,
        Permission.NEWS_IMPORT,
        Permission.CATEGORY_CREATE,
        Permission.CATEGORY_UPDATE,
        Permission.MODERATION_READ,
        Permission.MODERATION_REVIEW,
        Permission.SOURCE_READ,
        Permission.SOURCE_INGEST,
        Permission.ANALYTICS_READ,
    },
    Role.CONTENT_MANAGER: BASE_USER_PERMISSIONS | {
        Permission.NEWS_CREATE,
        Permission.NEWS_UPDATE,
        Permission.NEWS_DELETE,
        Permission.NEWS_PUBLISH,
        Permission.NEWS_UNPUBLISH,
        Permission.NEWS_IMPORT,
        Permission.CATEGORY_CREATE,
        Permission.CATEGORY_UPDATE,
        Permission.CATEGORY_DELETE,
        Permission.MODERATION_READ,
        Permission.MODERATION_REVIEW,
        Permission.SOURCE_READ,
        Permission.SOURCE_CREATE,
        Permission.SOURCE_UPDATE,
        Permission.SOURCE_INGEST,
        Permission.ANALYTICS_READ,
    },
    Role.AD_MANAGER: BASE_USER_PERMISSIONS | {
        Permission.ADS_CREATE,
        Permission.ADS_READ,
        Permission.ADS_UPDATE,
        Permission.ADS_APPROVE,
        Permission.ADS_PAUSE,
        Permission.ADS_DELETE,
        Permission.SPONSORED_CREATE,
        Permission.SPONSORED_READ,
        Permission.SPONSORED_UPDATE,
        Permission.SPONSORED_APPROVE,
        Permission.SPONSORED_PUBLISH,
        Permission.SPONSORED_DELETE,
        Permission.ANALYTICS_READ,
    },
    Role.ANALYST: BASE_USER_PERMISSIONS | {
        Permission.ANALYTICS_READ,
        Permission.ANALYTICS_EXPORT,
        Permission.AUDIT_READ,
        Permission.USER_READ,
    },
    Role.SUPPORT: BASE_USER_PERMISSIONS | {
        Permission.USER_READ,
        Permission.USER_UPDATE,
        Permission.MODERATION_READ,
    },
    Role.ADMIN: set(Permission),  # All permissions except super admin system overrides
    Role.SUPER_ADMIN: set(Permission),  # Complete access
}


def user_has_permission(user_role: Union[int, str, Role], permission: Permission) -> bool:
    """Check if a given role possesses a specific permission."""
    role_enum = get_role_from_value(user_role)
    allowed_perms = ROLE_PERMISSIONS.get(role_enum, set())
    return permission in allowed_perms


def user_has_any_permission(user_role: Union[int, str, Role], permissions: List[Permission]) -> bool:
    """Check if a given role possesses at least one of the listed permissions."""
    role_enum = get_role_from_value(user_role)
    allowed_perms = ROLE_PERMISSIONS.get(role_enum, set())
    return any(p in allowed_perms for p in permissions)


has_permission = user_has_permission


def get_role_permissions(user_role: Union[int, str, Role]) -> Set[Permission]:
    """Retrieve the set of permissions assigned to a given role."""
    role_enum = get_role_from_value(user_role)
    return ROLE_PERMISSIONS.get(role_enum, set())
