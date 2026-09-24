# services/audit_service.py
"""
Audit Logging Service for Recording Immutable Security and Administrative Actions.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import logging
from sqlalchemy.orm import Session
from fastapi import Request

from models.audit import AuditLog
from middleware.ip_whitelist import get_client_ip

logger = logging.getLogger(__name__)


def record_audit_log(
    db: Session,
    actor_uid: Optional[str] = None,
    action: str = "",
    resource_type: str = "",
    resource_id: Optional[str] = None,
    status: str = "SUCCESS",
    details: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_uid: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None,
    **kwargs: Any
) -> Optional[AuditLog]:
    """
    Safely records an immutable audit log entry.
    Fails open so business operations are not blocked if audit write fails.
    """
    try:
        effective_actor = actor_uid or user_uid or "system"
        effective_details = details or changes or {}
        client_ip = ip_address
        if not client_ip and request:
            client_ip = get_client_ip(request)

        entry = AuditLog(
            actor_uid=effective_actor,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=client_ip,
            status=status,
            details=effective_details,
            error_message=error_message,
            created_at=datetime.now(timezone.utc)
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as exc:
        db.rollback()
        logger.error("Failed to record audit log for %s: %s", action, exc)
        return None
