# models/audit.py
"""
Immutable Audit Log Data Model for Sensitive Operations.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON, Index, Text
from sqlalchemy.sql import func
from database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_uid = Column(String(8), nullable=False, index=True)
    action = Column(String(50), nullable=False, index=True)  # e.g. "USER_SUSPENDED", "ROLE_ASSIGNED"
    resource_type = Column(String(50), nullable=False, index=True)  # "user", "news", "campaign", "ad"
    resource_id = Column(String(100), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    status = Column(String(20), default="SUCCESS", index=True)  # "SUCCESS", "FAILED"
    details = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("ix_audit_logs_actor_time", "actor_uid", "created_at"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
    )
