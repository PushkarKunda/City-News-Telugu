from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from database import Base
import hashlib
import hmac
import secrets


class SecurityUtils:
    """Security utilities for hashing and fingerprinting"""
    
    @staticmethod
    def hash_value(value: str) -> str:
        """Hash a value for lookup (not for encryption)"""
        if not value:
            return None
        return hashlib.sha256(value.encode()).hexdigest()
    
    @staticmethod
    def generate_device_fingerprint(ip: str, user_agent: str, device_info: dict) -> str:
        """Generate a device fingerprint that's hard to spoof"""
        fingerprint_data = f"{ip}|{user_agent}|{device_info.get('device_model', '')}|{device_info.get('os_version', '')}|{device_info.get('device_type', '')}"
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()


class UserSession(Base):
    """Track user sessions and devices with enhanced security"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Hashed session ID (never store raw session ID in DB)
    session_id_hash = Column(String(64), unique=True, nullable=False, index=True)
    
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    
    # Device fingerprint (hashed, not reversible)
    device_fingerprint = Column(String(64), nullable=False, index=True)
    device_id_hash = Column(String(64), nullable=False, index=True)
    
    # Device info (some fields encrypted by EncryptionService, some plain)
    device_type = Column(String(20), nullable=False)
    # These will be encrypted before storage by the application layer
    device_name = Column(Text, nullable=True)  # Will store encrypted value
    device_model = Column(Text, nullable=True)  # Will store encrypted value
    os_version = Column(Text, nullable=True)  # Will store encrypted value
    app_version = Column(Text, nullable=True)  # Will store encrypted value
    fcm_token = Column(Text, nullable=True)  # Will store encrypted value
    
    # Session info (encrypted)
    ip_address = Column(Text, nullable=True)  # Will store encrypted value
    user_agent_hash = Column(String(64), nullable=True)  # Hashed for matching
    location = Column(Text, nullable=True)  # Will store encrypted value
    
    # Security fields
    session_token_version = Column(Integer, default=1)
    csrf_token_hash = Column(String(64), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_current = Column(Boolean, default=False, index=True)
    is_verified = Column(Boolean, default=False)  # MFA verified
    
    # Timestamps
    login_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    logout_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Token tracking
    token_version = Column(Integer, default=1)
    refresh_token_hash = Column(String(64), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    activities = relationship("UserActivity", back_populates="session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_session_user_active', 'user_uid', 'is_active'),
        Index('idx_session_fingerprint', 'device_fingerprint', 'user_uid'),
        Index('idx_session_expires', 'expires_at'),
    )
    
    def __repr__(self):
        return f"<UserSession(session_hash='{self.session_id_hash[:8]}...', user_uid='{self.user_uid}')>"


class UserActivity(Base):
    """Track user activities with security logging"""
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(String(36), unique=True, nullable=False, index=True)
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("user_sessions.id", ondelete="SET NULL"), nullable=True)
    
    # Activity details
    action = Column(String(50), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)  # Can be plain or hashed
    
    # Request details
    method = Column(String(10), nullable=True)
    endpoint_hash = Column(String(64), nullable=True)  # Hash endpoint for grouping
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    
    # Security event flag
    is_security_event = Column(Boolean, default=False, index=True)
    severity = Column(String(20), nullable=True)  # LOW, MEDIUM, HIGH, CRITICAL
    
    # Details (encrypted by EncryptionService)
    ip_address = Column(Text, nullable=True)  # Will store encrypted value
    user_agent_hash = Column(String(64), nullable=True)
    location = Column(Text, nullable=True)  # Will store encrypted value
    old_value = Column(Text, nullable=True)  # Will store encrypted JSON
    new_value = Column(Text, nullable=True)  # Will store encrypted JSON
    error_message = Column(Text, nullable=True)  # Will store encrypted value
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="activities")
    session = relationship("UserSession", back_populates="activities")
    
    __table_args__ = (
        Index('idx_activity_user_time', 'user_uid', 'created_at'),
        Index('idx_activity_action_time', 'action', 'created_at'),
        Index('idx_security_events', 'is_security_event', 'severity', 'created_at'),
    )
    
    def __repr__(self):
        return f"<UserActivity(activity_id='{self.activity_id}', action='{self.action}', is_security_event={self.is_security_event})>"


class DeviceBlacklist(Base):
    """Blacklist devices with cryptographic verification"""
    __tablename__ = "device_blacklist"
    
    id = Column(Integer, primary_key=True, index=True)
    device_fingerprint = Column(String(64), unique=True, nullable=False, index=True)
    device_id_hash = Column(String(64), nullable=False, index=True)
    reason = Column(Text, nullable=False)  # Will store encrypted value
    blocked_by = Column(String(8), ForeignKey("users.user_uid"), nullable=False)
    blocked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_permanent = Column(Boolean, default=False)
    signature = Column(String(128), nullable=True)  # HMAC signature for verification
    
    # Relationships
    blocked_by_user = relationship("User", foreign_keys=[blocked_by])
    
    def __repr__(self):
        return f"<DeviceBlacklist(fingerprint='{self.device_fingerprint[:8]}...', is_permanent={self.is_permanent})>"


class SecurityAuditLog(Base):
    """Separate table for security-critical events (cannot be deleted)"""
    __tablename__ = "security_audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(36), unique=True, nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    user_uid = Column(String(8), ForeignKey("users.user_uid", ondelete="SET NULL"), nullable=True)
    
    # Event details (encrypted by EncryptionService)
    details = Column(Text, nullable=False)  # Will store encrypted JSON
    ip_address = Column(Text, nullable=True)  # Will store encrypted value
    user_agent_hash = Column(String(64), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(8), nullable=True)
    
    __table_args__ = (
        Index('idx_audit_severity_time', 'severity', 'created_at'),
        Index('idx_audit_user_time', 'user_uid', 'created_at'),
    )