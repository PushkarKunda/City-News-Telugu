from datetime import datetime, timezone
import json
from operator import or_
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy import desc
from sqlalchemy.orm import Session
import logging

import models
import schemas
from database import get_db
from models.user import User
from auth.dependencies import get_current_user, require_role
from schemas import UserRole
from schemas_user_activity import (
    DeviceInfo, SessionResponse, ActiveSessionsResponse,
    KillSessionRequest, KillAllOtherSessionsRequest,
    ActivityLogResponse, PaginatedActivityResponse,
    DeviceBlacklistRequest, DeviceBlacklistResponse,
    SessionStatsResponse, get_max_devices,
    ActivityLogCreate, ActivityAction
)
from services.user_activity_service import UserActivityService, get_activity_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user-activity", tags=["User Activity"])


# =========================================================
# Helper Functions
# =========================================================

def get_session_id_from_request(request: Request) -> Optional[str]:
    """Extract session ID from request headers or token"""
    # You can extract from Authorization header or custom header
    session_id = request.headers.get("X-Session-Id")
    return session_id


# =========================================================
# Session Management Endpoints
# =========================================================

@router.get("/sessions", response_model=ActiveSessionsResponse)
def get_my_sessions(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get all active sessions for current user
    
    Returns:
        - Current session details
        - List of other active sessions
        - Device limit information
    """
    sessions = activity_service.get_active_sessions(current_user.user_uid)
    
    current_session = None
    other_sessions = []
    current_session_id_hash = None
    
    # Get current session ID from request
    current_session_id = get_session_id_from_request(request)
    if current_session_id:
        import hashlib
        current_session_id_hash = hashlib.sha256(current_session_id.encode()).hexdigest()
    
    for session in sessions:
        # Decrypt device name for display
        device_name = None
        if session.device_name:
            try:
                from services.encryption_service import encryption_service
                device_name = encryption_service.decrypt(session.device_name)
            except:
                device_name = "Unknown Device"
        
        # Decrypt location if available
        location = None
        if session.location:
            try:
                from services.encryption_service import encryption_service
                location = encryption_service.decrypt(session.location)
            except:
                location = None
        
        session_response = SessionResponse(
            session_id=session.session_id_hash,  # Return hash, not actual ID
            device_id=session.device_id_hash[:16] + "...",  # Partial hash for display
            device_name=device_name,
            device_type=session.device_type,
            device_model=None,  # Don't expose decrypted device model
            is_active=session.is_active,
            is_current=(session.session_id_hash == current_session_id_hash) if current_session_id_hash else False,
            ip_address=None,  # Don't expose IP address
            location=location,
            login_at=session.login_at,
            last_activity_at=session.last_activity_at,
            expires_at=session.expires_at
        )
        
        if session_response.is_current:
            current_session = session_response
        else:
            other_sessions.append(session_response)
    
    max_devices = get_max_devices(current_user.role)
    
    return ActiveSessionsResponse(
        current_session=current_session,
        other_sessions=other_sessions,
        total_active_sessions=len(sessions),
        max_allowed_devices=max_devices,
        can_add_more=len(sessions) < max_devices
    )


@router.delete("/sessions/{session_id_hash}", status_code=status.HTTP_204_NO_CONTENT)
def kill_session(
    session_id_hash: str,
    request: KillSessionRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Kill a specific session by its hash
    
    Args:
        session_id_hash: The hashed session ID to kill
        request: Optional reason for killing the session
    """
    killed = activity_service.kill_session(
        current_user.user_uid,
        session_id_hash,
        reason=request.reason if request else "User requested"
    )
    
    if not killed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Log activity
    activity_service.log_activity(
        current_user.user_uid,
        ActivityLogCreate(
            action=ActivityAction.SESSION_KILLED,
            resource_type="session",
            resource_id=session_id_hash,
            new_value={"reason": request.reason if request else "User requested"}
        )
    )
    
    return None


@router.post("/sessions/kill-all", status_code=status.HTTP_200_OK)
def kill_all_other_sessions(
    request: KillAllOtherSessionsRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Kill all other sessions except current
    
    Args:
        request: Optional configuration (keep_current, reason)
    """
    # Get current session ID
    current_sessions = activity_service.get_active_sessions(current_user.user_uid)
    if not current_sessions:
        raise HTTPException(status_code=404, detail="No active session found")
    
    # Find current session (the one with is_current=True)
    current_session = None
    for session in current_sessions:
        if session.is_current:
            current_session = session
            break
    
    if not current_session:
        current_session = current_sessions[0]  # Fallback to most recent
    
    keep_current = True
    if request:
        keep_current = request.keep_current
    
    killed_count = 0
    if keep_current:
        killed_count = activity_service.kill_all_other_sessions(
            current_user.user_uid,
            current_session.session_id_hash,
            reason=request.reason if request else "User requested"
        )
    else:
        # Kill all sessions including current (logout from all devices)
        all_sessions = activity_service.get_active_sessions(current_user.user_uid)
        for session in all_sessions:
            activity_service.kill_session(
                current_user.user_uid,
                session.session_id_hash,
                reason=request.reason if request else "User requested"
            )
        killed_count = len(all_sessions)
    
    # Log activity
    activity_service.log_activity(
        current_user.user_uid,
        ActivityLogCreate(
            action=ActivityAction.SESSION_KILLED,
            resource_type="session",
            new_value={
                "sessions_killed": killed_count,
                "keep_current": keep_current,
                "reason": request.reason if request else "User requested"
            }
        )
    )
    
    return {
        "message": f"Successfully killed {killed_count} session(s)",
        "killed_count": killed_count,
        "current_session_kept": keep_current
    }


# =========================================================
# Activity Log Endpoints
# =========================================================

@router.get("/activities/me", response_model=PaginatedActivityResponse)
def get_my_activities(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    from_date: Optional[datetime] = Query(None, description="Start date (UTC)"),
    to_date: Optional[datetime] = Query(None, description="End date (UTC)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get current user's activity logs
    
    Returns paginated list of user activities with optional filters
    """
    result = activity_service.get_user_activities(
        current_user.user_uid,
        page=page,
        limit=limit,
        action=action,
        from_date=from_date,
        to_date=to_date
    )
    
    # Convert to response models
    items = []
    for item in result["items"]:
        items.append(ActivityLogResponse(
            id=item["id"],
            activity_id=item["activity_id"],
            user_uid=item["user_uid"],
            action=item["action"],
            resource_type=item.get("resource_type"),
            resource_id=item.get("resource_id"),
            method=item.get("method"),
            endpoint=None,  # Don't expose endpoint
            status_code=item.get("status_code"),
            response_time_ms=item.get("response_time_ms"),
            ip_address=None,  # Don't expose IP
            location=item.get("location"),
            old_value=item.get("old_value"),
            new_value=item.get("new_value"),
            error_message=item.get("error_message"),
            created_at=item["created_at"]
        ))
    
    return PaginatedActivityResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        limit=result["limit"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_previous=result["has_previous"]
    )


@router.get("/activities/user/{user_uid}", response_model=PaginatedActivityResponse)
def get_user_activities_admin(
    user_uid: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    include_sensitive: bool = Query(False, description="Include IP addresses and endpoints (admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get activity logs for any user (Admin only)
    
    Args:
        user_uid: The user to fetch activities for
        include_sensitive: If True, includes IP addresses and endpoints
    """
    result = activity_service.get_user_activities(
        user_uid,
        page=page,
        limit=limit,
        action=action,
        from_date=from_date,
        to_date=to_date
    )
    
    items = []
    for item in result["items"]:
        items.append(ActivityLogResponse(
            id=item["id"],
            activity_id=item["activity_id"],
            user_uid=item["user_uid"],
            action=item["action"],
            resource_type=item.get("resource_type"),
            resource_id=item.get("resource_id"),
            method=item.get("method"),
            endpoint=item.get("endpoint") if include_sensitive else None,
            status_code=item.get("status_code"),
            response_time_ms=item.get("response_time_ms"),
            ip_address=item.get("ip_address") if include_sensitive else None,
            location=item.get("location"),
            old_value=item.get("old_value"),
            new_value=item.get("new_value"),
            error_message=item.get("error_message"),
            created_at=item["created_at"]
        ))
    
    return PaginatedActivityResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        limit=result["limit"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_previous=result["has_previous"]
    )


@router.get("/activities/security-events", response_model=PaginatedActivityResponse)
def get_security_events(
    severity: Optional[str] = Query(None, enum=["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get security event logs (Admin only)
    
    Returns only security-critical events with severity filtering
    """
    # Query security events from UserActivity table
    query = db.query(models.user_activity.UserActivity).filter(
        models.user_activity.UserActivity.is_security_event == True
    )
    
    if severity:
        query = query.filter(models.user_activity.UserActivity.severity == severity)
    if from_date:
        query = query.filter(models.user_activity.UserActivity.created_at >= from_date)
    if to_date:
        query = query.filter(models.user_activity.UserActivity.created_at <= to_date)
    
    total = query.count()
    offset = (page - 1) * limit
    events = query.order_by(desc(models.user_activity.UserActivity.created_at)).offset(offset).limit(limit).all()
    
    # Decrypt and format
    items = []
    for event in events:
        items.append(ActivityLogResponse(
            id=event.id,
            activity_id=event.activity_id,
            user_uid=event.user_uid,
            action=event.action,
            resource_type=event.resource_type,
            resource_id=event.resource_id,
            method=event.method,
            endpoint=None,
            status_code=event.status_code,
            response_time_ms=event.response_time_ms,
            ip_address=None,  # Don't expose IP for security events
            location=None,
            old_value=None,
            new_value=None,
            error_message=None,
            created_at=event.created_at
        ))
    
    return PaginatedActivityResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
        has_next=offset + limit < total,
        has_previous=page > 1
    )


# =========================================================
# Device Management Endpoints (Admin only)
# =========================================================

@router.post("/devices/blacklist", response_model=DeviceBlacklistResponse)
def blacklist_device(
    request: DeviceBlacklistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Blacklist a device (Admin only)
    
    Prevents the device from logging into any account
    """
    blacklist = activity_service.blacklist_device(
        device_id=request.device_id,
        reason=request.reason,
        blocked_by=current_user.user_uid,
        expires_at=request.expires_at,
        is_permanent=request.is_permanent
    )
    
    # Log admin action
    activity_service.log_activity(
        current_user.user_uid,
        ActivityLogCreate(
            action=ActivityAction.SUSPEND_USER,
            resource_type="device",
            resource_id=request.device_id,
            new_value={
                "reason": request.reason,
                "is_permanent": request.is_permanent,
                "expires_at": request.expires_at.isoformat() if request.expires_at else None
            }
        )
    )
    
    return DeviceBlacklistResponse(
        device_id=blacklist.device_id_hash[:16] + "...",
        reason=request.reason,
        blocked_by=blacklist.blocked_by,
        blocked_at=blacklist.blocked_at,
        expires_at=blacklist.expires_at,
        is_permanent=blacklist.is_permanent
    )


@router.delete("/devices/blacklist/{device_fingerprint}", status_code=status.HTTP_204_NO_CONTENT)
def remove_device_blacklist(
    device_fingerprint: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Remove device from blacklist (Admin only)
    
    Allows the device to log in again
    """
    removed = activity_service.remove_device_blacklist(device_fingerprint)
    
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found in blacklist"
        )
    
    # Log admin action
    activity_service.log_activity(
        current_user.user_uid,
        ActivityLogCreate(
            action=ActivityAction.ACTIVATE_USER,
            resource_type="device",
            resource_id=device_fingerprint,
            new_value={"action": "removed_from_blacklist"}
        )
    )
    
    return None


@router.get("/devices/blacklist", response_model=List[DeviceBlacklistResponse])
def get_blacklisted_devices(
    include_expired: bool = Query(False, description="Include expired blacklist entries"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get list of blacklisted devices (Admin only)
    """
    query = db.query(models.user_activity.DeviceBlacklist)
    
    if not include_expired:
        query = query.filter(
            or_(
                models.user_activity.DeviceBlacklist.is_permanent == True,
                models.user_activity.DeviceBlacklist.expires_at > datetime.now(timezone.utc)
            )
        )
    
    blacklisted = query.order_by(desc(models.user_activity.DeviceBlacklist.blocked_at)).all()
    
    result = []
    for device in blacklisted:
        from services.encryption_service import encryption_service
        reason = encryption_service.decrypt(device.reason) if device.reason else None
        
        result.append(DeviceBlacklistResponse(
            device_id=device.device_id_hash[:16] + "...",
            reason=reason,
            blocked_by=device.blocked_by,
            blocked_at=device.blocked_at,
            expires_at=device.expires_at,
            is_permanent=device.is_permanent
        ))
    
    return result


# =========================================================
# Session Statistics
# =========================================================

@router.get("/stats/me", response_model=SessionStatsResponse)
def get_my_session_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get session statistics for current user
    
    Returns:
        - Total and active sessions
        - Unique devices
        - Most used device type
        - Average session duration
    """
    stats = activity_service.get_session_stats(current_user.user_uid)
    
    return SessionStatsResponse(
        total_sessions=stats["total_sessions"],
        active_sessions=stats["active_sessions"],
        active_devices=stats["active_devices"],
        sessions_today=stats["sessions_today"],
        unique_devices_last_30_days=stats["unique_devices_last_30_days"],
        most_used_device=stats["most_used_device"],
        average_session_duration_hours=stats["average_session_duration_hours"]
    )


@router.get("/stats/user/{user_uid}", response_model=SessionStatsResponse)
def get_user_session_stats_admin(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get session statistics for any user (Admin only)
    
    Useful for monitoring user activity and detecting anomalies
    """
    stats = activity_service.get_session_stats(user_uid)
    
    return SessionStatsResponse(
        total_sessions=stats["total_sessions"],
        active_sessions=stats["active_sessions"],
        active_devices=stats["active_devices"],
        sessions_today=stats["sessions_today"],
        unique_devices_last_30_days=stats["unique_devices_last_30_days"],
        most_used_device=stats["most_used_device"],
        average_session_duration_hours=stats["average_session_duration_hours"]
    )


# =========================================================
# Device Limit Info
# =========================================================

@router.get("/device-limit")
def get_device_limit_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get device limit information for current user
    
    Shows:
        - Maximum allowed devices for user's role
        - Currently active devices
        - Available slots
    """
    active_sessions = len(activity_service.get_active_sessions(current_user.user_uid))
    max_devices = get_max_devices(current_user.role)
    
    return {
        "role": current_user.role,
        "role_name": UserRole(current_user.role).name,
        "max_devices": max_devices,
        "active_devices": active_sessions,
        "available_slots": max(0, max_devices - active_sessions),
        "can_add_more": active_sessions < max_devices
    }


# =========================================================
# Session Cleanup (Internal endpoint)
# =========================================================

@router.post("/cleanup-expired", tags=["Internal"])
def cleanup_expired_sessions(
    api_key: str = Query(..., description="Internal API key for authentication"),
    db: Session = Depends(get_db),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Cleanup expired sessions (Internal endpoint)
    
    This should be called by a cron job periodically.
    Requires internal API key for security.
    """
    # Verify internal API key
    import os
    expected_key = os.getenv("INTERNAL_API_KEY", "")
    if not expected_key or api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    expired_count = activity_service.cleanup_expired_sessions()
    
    return {
        "message": f"Cleaned up {expired_count} expired sessions",
        "expired_count": expired_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# =========================================================
# Security Audit Endpoints (Super Admin only)
# =========================================================

@router.get("/audit/security-logs", tags=["Admin"])
def get_security_audit_logs(
    severity: Optional[str] = Query(None, enum=["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    user_uid: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Get security audit logs (Admin only)
    
    These are immutable security events that cannot be deleted.
    Useful for security investigations and compliance.
    """
    from models.user_activity import SecurityAuditLog
    from services.encryption_service import encryption_service
    
    query = db.query(SecurityAuditLog)
    
    if severity:
        query = query.filter(SecurityAuditLog.severity == severity)
    if user_uid:
        query = query.filter(SecurityAuditLog.user_uid == user_uid)
    if from_date:
        query = query.filter(SecurityAuditLog.created_at >= from_date)
    if to_date:
        query = query.filter(SecurityAuditLog.created_at <= to_date)
    
    total = query.count()
    offset = (page - 1) * limit
    logs = query.order_by(desc(SecurityAuditLog.created_at)).offset(offset).limit(limit).all()
    
    items = []
    for log in logs:
        # Decrypt details
        details = None
        if log.details:
            try:
                details = json.loads(encryption_service.decrypt(log.details))
            except:
                details = {"error": "Failed to decrypt"}
        
        items.append({
            "event_id": log.event_id,
            "event_type": log.event_type,
            "severity": log.severity,
            "user_uid": log.user_uid,
            "details": details,
            "created_at": log.created_at,
            "is_resolved": log.is_resolved,
            "resolved_at": log.resolved_at,
            "resolved_by": log.resolved_by
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "has_next": offset + limit < total,
        "has_previous": page > 1
    }


@router.post("/audit/resolve/{event_id}", tags=["Admin"])
def resolve_security_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    activity_service: UserActivityService = Depends(get_activity_service)
):
    """
    Mark a security event as resolved (Admin only)
    
    This helps track which security issues have been addressed.
    """
    from models.user_activity import SecurityAuditLog
    
    log = db.query(SecurityAuditLog).filter(SecurityAuditLog.event_id == event_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Security event not found")
    
    log.is_resolved = True
    log.resolved_at = datetime.now(timezone.utc)
    log.resolved_by = current_user.user_uid
    
    db.commit()
    
    return {
        "message": "Security event marked as resolved",
        "event_id": event_id,
        "resolved_at": log.resolved_at,
        "resolved_by": log.resolved_by
    }


# =========================================================
# Health Check
# =========================================================

@router.get("/health", tags=["Health"])
def user_activity_health_check(
    db: Session = Depends(get_db)
):
    """Health check endpoint for user activity service"""
    try:
        # Check database connection
        from models.user_activity import UserSession
        session_count = db.query(UserSession).count()
        
        return {
            "status": "healthy",
            "service": "user_activity_router",
            "database": "connected",
            "total_sessions": session_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )