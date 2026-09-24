"""User activity and session schemas."""

from enum import Enum
from typing import Any, Dict, List, Optional
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeviceType(str, Enum):
    """Supported device types for sessions."""

    ANDROID = "android"
    IOS = "ios"
    WEB = "web"
    DESKTOP = "desktop"
    OTHER = "other"


class DeviceInfo(BaseModel):
    """Client device information used for session tracking."""

    device_id: str
    device_type: DeviceType
    device_name: Optional[str] = None
    device_model: Optional[str] = None
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    fcm_token: Optional[str] = None


class ActivityAction(str, Enum):
    """Common activity action names for logging."""

    LOGIN_FAILED = "LOGIN_FAILED"
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGOUT = "LOGOUT"
    SESSION_KILLED = "SESSION_KILLED"
    SUSPEND_USER = "SUSPEND_USER"
    ACTIVATE_USER = "ACTIVATE_USER"
    CHANGE_ROLE = "CHANGE_ROLE"
    DELETE_USER = "DELETE_USER"
    DELETE_NEWS = "DELETE_NEWS"
    PASSWORD_RESET = "PASSWORD_RESET"
    PROFILE_UPDATE = "PROFILE_UPDATE"


def get_max_devices(role: int) -> int:
    """Return the max devices allowed for a role."""

    role_limits = {
        0: 1,   # GUEST
        1: 3,   # USER
        2: 5,   # PUBLISHER
        3: 6,   # MODERATOR
        4: 8,   # EMPLOYEE
        5: 10,  # ADMIN
    }
    return role_limits.get(int(role), 3)


class ActivityLogCreate(BaseModel):
    """Create payload for activity logging."""

    action: ActivityAction | str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    method: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class ActivityLogResponse(BaseModel):
    """Activity log response payload."""

    id: int
    activity_id: str
    user_uid: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    method: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedActivityResponse(BaseModel):
    """Paginated response for activity logs."""

    items: List[ActivityLogResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_previous: bool


class SessionResponse(BaseModel):
    """Session response payload."""

    session_id: str
    device_id: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    device_model: Optional[str] = None
    is_active: bool = True
    is_current: bool = False
    ip_address: Optional[str] = None
    location: Optional[str] = None
    login_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ActiveSessionsResponse(BaseModel):
    """Aggregate response for active sessions."""

    current_session: Optional[SessionResponse] = None
    other_sessions: List[SessionResponse] = Field(default_factory=list)
    total_active_sessions: int
    max_allowed_devices: int
    can_add_more: bool


class KillSessionRequest(BaseModel):
    """Request to kill a specific session."""

    reason: Optional[str] = Field(None, max_length=200)


class KillAllOtherSessionsRequest(BaseModel):
    """Request to kill all other sessions."""

    keep_current: bool = True
    reason: Optional[str] = Field(None, max_length=200)


class DeviceBlacklistRequest(BaseModel):
    """Request to blacklist a device."""

    device_id: str
    reason: str
    expires_at: Optional[datetime] = None
    is_permanent: bool = False


class DeviceBlacklistResponse(BaseModel):
    """Response for blacklisted device entries."""

    device_id: str
    reason: Optional[str] = None
    blocked_by: str
    blocked_at: datetime
    expires_at: Optional[datetime] = None
    is_permanent: bool = False

    model_config = ConfigDict(from_attributes=True)


class SessionStatsResponse(BaseModel):
    """Session statistics response."""

    total_sessions: int
    active_sessions: int
    active_devices: int
    sessions_today: int
    unique_devices_last_30_days: int
    most_used_device: Optional[str] = None
    average_session_duration_hours: float
