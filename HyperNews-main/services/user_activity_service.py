import uuid
import json
import secrets
import hashlib
import hmac
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func, or_
from fastapi import Depends, HTTPException, status, Request
from database import get_db
import logging

from models.user_activity import (
    UserSession, UserActivity, DeviceBlacklist, SecurityAuditLog,
    SecurityUtils
)
from models.user import User
from schemas_user_activity import (
    DeviceInfo, ActivityLogCreate, ActivityAction, get_max_devices
)
from services.encryption_service import encryption_service

logger = logging.getLogger(__name__)


class SecurityEventType:
    """Security event types for audit logging"""
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    SUSPICIOUS_DEVICE = "SUSPICIOUS_DEVICE"
    DEVICE_BLACKLISTED = "DEVICE_BLACKLISTED"
    SESSION_HIJACK_ATTEMPT = "SESSION_HIJACK_ATTEMPT"
    TOKEN_THEFT_DETECTED = "TOKEN_THEFT_DETECTED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"


class UserActivityService:
    """Security-hardened service for managing user sessions and activities"""
    
    def __init__(self, db: Session, request: Request = None):
        self.db = db
        self.request = request
    
    # =========================================================
    # Session Management with Security
    # =========================================================
    
    def create_session(
        self,
        user: User,
        device_info: DeviceInfo,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        location: Optional[str] = None,
        expires_in_days: int = 30
    ) -> UserSession:
        """Create a new user session with security measures"""
        
        # Generate device fingerprint (hard to spoof)
        device_fingerprint = SecurityUtils.generate_device_fingerprint(
            ip_address or "",
            user_agent or "",
            device_info.dict()
        )
        
        # Check device limit
        self._check_device_limit(user.user_uid, user.role)
        
        # Check if device is blacklisted
        self._check_device_blacklist(device_fingerprint)
        
        # Detect suspicious login patterns
        self._detect_suspicious_login(user, device_fingerprint, ip_address)
        
        # Generate secure session ID
        session_id = secrets.token_urlsafe(32)
        session_id_hash = hashlib.sha256(session_id.encode()).hexdigest()
        
        # Generate CSRF token
        csrf_token = secrets.token_urlsafe(32)
        csrf_token_hash = hashlib.sha256(csrf_token.encode()).hexdigest()
        
        # Hash device ID for lookup
        device_id_hash = hashlib.sha256(device_info.device_id.encode()).hexdigest()
        
        # Deactivate old sessions for same device fingerprint
        self._deactivate_old_device_sessions(user.user_uid, device_fingerprint)
        
        # Set expiry
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
        
        # Encrypt sensitive data using EncryptionService
        encrypted_device_name = encryption_service.encrypt(device_info.device_name or "")
        encrypted_device_model = encryption_service.encrypt(device_info.device_model or "")
        encrypted_os_version = encryption_service.encrypt(device_info.os_version or "")
        encrypted_app_version = encryption_service.encrypt(device_info.app_version or "")
        encrypted_fcm_token = encryption_service.encrypt(device_info.fcm_token or "") if device_info.fcm_token else None
        encrypted_ip = encryption_service.encrypt(ip_address or "")
        encrypted_location = encryption_service.encrypt(location or "") if location else None
        
        # Create new session
        new_session = UserSession(
            session_id_hash=session_id_hash,
            user_uid=user.user_uid,
            device_fingerprint=device_fingerprint,
            device_id_hash=device_id_hash,
            device_type=device_info.device_type.value,
            device_name=encrypted_device_name,
            device_model=encrypted_device_model,
            os_version=encrypted_os_version,
            app_version=encrypted_app_version,
            fcm_token=encrypted_fcm_token,
            ip_address=encrypted_ip,
            user_agent_hash=hashlib.sha256((user_agent or "").encode()).hexdigest(),
            location=encrypted_location,
            csrf_token_hash=csrf_token_hash,
            is_active=True,
            is_current=True,
            is_verified=False,
            login_at=datetime.now(timezone.utc),
            last_activity_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            token_version=1,
            session_token_version=1
        )
        
        self.db.add(new_session)
        
        # Mark all other sessions as not current
        self.db.query(UserSession).filter(
            UserSession.user_uid == user.user_uid,
            UserSession.id != new_session.id
        ).update({"is_current": False})
        
        self.db.commit()
        self.db.refresh(new_session)
        
        # Log successful login
        self._log_security_event(
            event_type=SecurityEventType.LOGIN_SUCCESS,
            severity="LOW",
            user_uid=user.user_uid,
            details={
                "device_type": device_info.device_type.value,
                "device_fingerprint": device_fingerprint[:8],
                "ip_address": ip_address
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Store plain values for response (not saved to DB)
        new_session.plain_session_id = session_id
        new_session.plain_csrf_token = csrf_token
        
        return new_session
    
    def validate_session(self, session_id: str, csrf_token: str = None) -> Optional[UserSession]:
        """Validate session and check for security issues"""
        
        session_id_hash = hashlib.sha256(session_id.encode()).hexdigest()
        
        session = self.db.query(UserSession).filter(
            UserSession.session_id_hash == session_id_hash,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        ).first()
        
        if not session:
            return None
        
        # Validate CSRF token for state-changing operations
        if csrf_token:
            csrf_token_hash = hashlib.sha256(csrf_token.encode()).hexdigest()
            if session.csrf_token_hash != csrf_token_hash:
                self._log_security_event(
                    event_type=SecurityEventType.SESSION_HIJACK_ATTEMPT,
                    severity="HIGH",
                    user_uid=session.user_uid,
                    details={"reason": "Invalid CSRF token"},
                    session=session
                )
                return None
        
        # Check for device fingerprint mismatch (potential session hijacking)
        if self.request:
            # You'd need to extract device info from headers
            # For now, just update activity
            session.last_activity_at = datetime.now(timezone.utc)
            self.db.commit()
        
        return session
    
    def _check_device_limit(self, user_uid: str, role: int):
        """Check if user has exceeded device limit"""
        max_devices = get_max_devices(role)
        
        active_sessions = self.db.query(UserSession).filter(
            UserSession.user_uid == user_uid,
            UserSession.is_active == True,
            UserSession.logout_at == None
        ).count()
        
        if active_sessions >= max_devices:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Maximum device limit ({max_devices}) reached. Please logout from another device first."
            )
    
    def _check_device_blacklist(self, device_fingerprint: str):
        """Check if device fingerprint is blacklisted"""
        blacklisted = self.db.query(DeviceBlacklist).filter(
            DeviceBlacklist.device_fingerprint == device_fingerprint,
            or_(
                DeviceBlacklist.is_permanent == True,
                DeviceBlacklist.expires_at > datetime.now(timezone.utc)
            )
        ).first()
        
        if blacklisted:
            reason = encryption_service.decrypt(blacklisted.reason)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Device is blocked. Reason: {reason}"
            )
    
    def _detect_suspicious_login(self, user: User, device_fingerprint: str, ip_address: str):
        """Detect suspicious login patterns"""
        
        # Check for rapid logins from different locations
        last_hour = datetime.now(timezone.utc) - timedelta(hours=1)
        
        recent_logins = self.db.query(UserSession).filter(
            UserSession.user_uid == user.user_uid,
            UserSession.login_at >= last_hour
        ).count()
        
        if recent_logins > 5:
            self._log_security_event(
                event_type=SecurityEventType.SUSPICIOUS_DEVICE,
                severity="HIGH",
                user_uid=user.user_uid,
                details={
                    "reason": "Too many login attempts in short period",
                    "attempts": recent_logins,
                    "device_fingerprint": device_fingerprint[:8]
                },
                ip_address=ip_address
            )
        
        # Check for login from new device while already logged in elsewhere
        existing_sessions = self.db.query(UserSession).filter(
            UserSession.user_uid == user.user_uid,
            UserSession.is_active == True
        ).count()
        
        if existing_sessions > 0:
            # Check if this device fingerprint already exists
            existing_device = self.db.query(UserSession).filter(
                UserSession.user_uid == user.user_uid,
                UserSession.device_fingerprint == device_fingerprint
            ).first()
            
            if not existing_device:
                self._log_security_event(
                    event_type=SecurityEventType.SUSPICIOUS_DEVICE,
                    severity="MEDIUM",
                    user_uid=user.user_uid,
                    details={
                        "reason": "Login from new device while active sessions exist",
                        "active_sessions": existing_sessions,
                        "new_device_fingerprint": device_fingerprint[:8]
                    },
                    ip_address=ip_address
                )
    
    def _deactivate_old_device_sessions(self, user_uid: str, device_fingerprint: str):
        """Deactivate old sessions for the same device fingerprint"""
        self.db.query(UserSession).filter(
            UserSession.user_uid == user_uid,
            UserSession.device_fingerprint == device_fingerprint,
            UserSession.is_active == True
        ).update({"is_active": False, "logout_at": datetime.now(timezone.utc)})
    
    def rotate_session_token(self, session: UserSession) -> str:
        """Rotate session token for security"""
        
        # Generate new session ID
        new_session_id = secrets.token_urlsafe(32)
        new_session_id_hash = hashlib.sha256(new_session_id.encode()).hexdigest()
        
        session.session_id_hash = new_session_id_hash
        session.session_token_version += 1
        
        self.db.commit()
        
        self._log_security_event(
            event_type="TOKEN_ROTATED",
            severity="LOW",
            user_uid=session.user_uid,
            details={"reason": "Periodic token rotation"},
            session=session
        )
        
        return new_session_id
    
    def kill_session(self, user_uid: str, session_id_hash: str, reason: str = "User requested") -> bool:
        """Kill a specific session"""
        session = self.db.query(UserSession).filter(
            UserSession.session_id_hash == session_id_hash,
            UserSession.user_uid == user_uid
        ).first()
        
        if not session:
            return False
        
        session.is_active = False
        session.logout_at = datetime.now(timezone.utc)
        self.db.commit()
        
        return True
    
    def kill_all_other_sessions(self, user_uid: str, current_session_id_hash: str, reason: str = "User requested") -> int:
        """Kill all other sessions except current"""
        result = self.db.query(UserSession).filter(
            UserSession.user_uid == user_uid,
            UserSession.session_id_hash != current_session_id_hash,
            UserSession.is_active == True
        ).update({
            "is_active": False, 
            "logout_at": datetime.now(timezone.utc)
        })
        
        self.db.commit()
        return result
    
    def _log_security_event(
        self,
        event_type: str,
        severity: str,
        user_uid: Optional[str],
        details: Dict,
        session: UserSession = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Log security-critical events to separate audit table"""
        
        # Encrypt sensitive details
        encrypted_details = encryption_service.encrypt(json.dumps(details))
        encrypted_ip = encryption_service.encrypt(ip_address or "") if ip_address else None
        
        audit_log = SecurityAuditLog(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            severity=severity,
            user_uid=user_uid,
            details=encrypted_details,
            ip_address=encrypted_ip,
            user_agent_hash=hashlib.sha256((user_agent or "").encode()).hexdigest() if user_agent else None,
            created_at=datetime.now(timezone.utc)
        )
        
        self.db.add(audit_log)
        self.db.commit()
        
        # Also log to application logger for real-time alerts
        logger.warning(f"SECURITY EVENT: {event_type} | SEVERITY: {severity} | USER: {user_uid} | DETAILS: {details}")
    
    def log_activity(
        self,
        user_uid: str,
        activity: ActivityLogCreate,
        session: UserSession = None,
        ip_address: str = None,
        user_agent: str = None,
        location: str = None
    ) -> UserActivity:
        """Log user activity with encryption"""
        
        # Determine if this is a security event
        security_actions = [
            ActivityAction.LOGIN_FAILED,
            ActivityAction.SUSPEND_USER,
            ActivityAction.CHANGE_ROLE,
            ActivityAction.DELETE_USER
        ]
        
        is_security_event = activity.action in security_actions
        severity = self._get_severity_for_action(activity.action)
        
        # Encrypt sensitive data
        encrypted_ip = encryption_service.encrypt(ip_address or "") if ip_address else None
        encrypted_location = encryption_service.encrypt(location or "") if location else None
        encrypted_old_value = encryption_service.encrypt(json.dumps(activity.old_value)) if activity.old_value else None
        encrypted_new_value = encryption_service.encrypt(json.dumps(activity.new_value)) if activity.new_value else None
        encrypted_error = encryption_service.encrypt(activity.error_message) if activity.error_message else None
        
        activity_log = UserActivity(
            activity_id=str(uuid.uuid4()),
            user_uid=user_uid,
            session_id=session.id if session else None,
            action=activity.action.value if hasattr(activity.action, 'value') else str(activity.action),
            resource_type=activity.resource_type,
            resource_id=activity.resource_id,
            method=activity.method,
            endpoint_hash=hashlib.sha256((activity.endpoint or "").encode()).hexdigest() if activity.endpoint else None,
            status_code=activity.status_code,
            response_time_ms=activity.response_time_ms,
            is_security_event=is_security_event,
            severity=severity,
            ip_address=encrypted_ip,
            user_agent_hash=hashlib.sha256((user_agent or "").encode()).hexdigest() if user_agent else None,
            location=encrypted_location,
            old_value=encrypted_old_value,
            new_value=encrypted_new_value,
            error_message=encrypted_error,
            created_at=datetime.now(timezone.utc)
        )
        
        self.db.add(activity_log)
        self.db.commit()
        self.db.refresh(activity_log)
        
        # Log high-severity events to security audit table
        if severity in ["HIGH", "CRITICAL"]:
            self._log_security_event(
                event_type=f"ACTIVITY_{activity.action}",
                severity=severity,
                user_uid=user_uid,
                details={
                    "action": str(activity.action),
                    "resource_type": activity.resource_type,
                    "resource_id": activity.resource_id,
                    "status_code": activity.status_code
                },
                session=session,
                ip_address=ip_address,
                user_agent=user_agent
            )
        
        return activity_log
    
    def _get_severity_for_action(self, action: ActivityAction) -> str:
        """Get severity level for different actions"""
        severity_map = {
            ActivityAction.LOGIN_FAILED: "MEDIUM",
            ActivityAction.SUSPEND_USER: "HIGH",
            ActivityAction.ACTIVATE_USER: "MEDIUM",
            ActivityAction.CHANGE_ROLE: "HIGH",
            ActivityAction.DELETE_USER: "CRITICAL",
            ActivityAction.DELETE_NEWS: "MEDIUM",
        }
        
        # Handle string conversion for enum
        action_str = str(action)
        if hasattr(action, 'value'):
            action_str = action.value
        
        for key, severity_level in severity_map.items():
            if str(key) == action_str or (hasattr(key, 'value') and key.value == action_str):
                return severity_level
        
        return "LOW"
    
    def get_user_activities(
        self,
        user_uid: str,
        page: int = 1,
        limit: int = 50,
        action: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get paginated user activities with decryption"""
        
        query = self.db.query(UserActivity).filter(UserActivity.user_uid == user_uid)
        
        if action:
            query = query.filter(UserActivity.action == action)
        if from_date:
            query = query.filter(UserActivity.created_at >= from_date)
        if to_date:
            query = query.filter(UserActivity.created_at <= to_date)
        
        total = query.count()
        offset = (page - 1) * limit
        
        activities = query.order_by(desc(UserActivity.created_at)).offset(offset).limit(limit).all()
        
        # Decrypt sensitive data for response
        decrypted_items = []
        for activity in activities:
            item = {
                "id": activity.id,
                "activity_id": activity.activity_id,
                "user_uid": activity.user_uid,
                "action": activity.action,
                "resource_type": activity.resource_type,
                "resource_id": activity.resource_id,
                "method": activity.method,
                "status_code": activity.status_code,
                "response_time_ms": activity.response_time_ms,
                "created_at": activity.created_at,
            }
            
            # Decrypt if values exist
            if activity.ip_address:
                item["ip_address"] = encryption_service.decrypt(activity.ip_address)
            if activity.location:
                item["location"] = encryption_service.decrypt(activity.location)
            if activity.old_value:
                try:
                    item["old_value"] = json.loads(encryption_service.decrypt(activity.old_value))
                except:
                    item["old_value"] = None
            if activity.new_value:
                try:
                    item["new_value"] = json.loads(encryption_service.decrypt(activity.new_value))
                except:
                    item["new_value"] = None
            if activity.error_message:
                item["error_message"] = encryption_service.decrypt(activity.error_message)
            
            decrypted_items.append(item)
        
        return {
            "items": decrypted_items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "has_next": offset + limit < total,
            "has_previous": page > 1
        }
    
    def get_active_sessions(self, user_uid: str) -> List[UserSession]:
        """Get all active sessions for a user"""
        return self.db.query(UserSession).filter(
            UserSession.user_uid == user_uid,
            UserSession.is_active == True,
            UserSession.logout_at == None
        ).order_by(desc(UserSession.login_at)).all()
    
    def blacklist_device(
        self,
        device_id: str,
        reason: str,
        blocked_by: str,
        expires_at: Optional[datetime] = None,
        is_permanent: bool = False
    ) -> DeviceBlacklist:
        """Blacklist a device with encryption"""
        
        # Get device fingerprint from active sessions
        device_id_hash = hashlib.sha256(device_id.encode()).hexdigest()
        
        session = self.db.query(UserSession).filter(
            UserSession.device_id_hash == device_id_hash,
            UserSession.is_active == True
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Device not found in active sessions"
            )
        
        # Check if already blacklisted
        existing = self.db.query(DeviceBlacklist).filter(
            DeviceBlacklist.device_fingerprint == session.device_fingerprint
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Device already blacklisted"
            )
        
        # Encrypt reason
        encrypted_reason = encryption_service.encrypt(reason)
        
        # Create blacklist entry with signature
        blacklist = DeviceBlacklist(
            device_fingerprint=session.device_fingerprint,
            device_id_hash=device_id_hash,
            reason=encrypted_reason,
            blocked_by=blocked_by,
            expires_at=expires_at,
            is_permanent=is_permanent
        )
        
        # Generate HMAC signature for tamper-proofing
        signature_data = f"{session.device_fingerprint}|{reason}|{blocked_by}|{expires_at}"
        blacklist.signature = hmac.new(
            secrets.token_bytes(32),
            signature_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        self.db.add(blacklist)
        
        # Kill all sessions for this device
        self.db.query(UserSession).filter(
            UserSession.device_fingerprint == session.device_fingerprint,
            UserSession.is_active == True
        ).update({
            "is_active": False,
            "logout_at": datetime.now(timezone.utc)
        })
        
        self.db.commit()
        self.db.refresh(blacklist)
        
        # Log security event
        self._log_security_event(
            event_type=SecurityEventType.DEVICE_BLACKLISTED,
            severity="HIGH",
            user_uid=session.user_uid,
            details={
                "reason": reason,
                "is_permanent": is_permanent,
                "expires_at": expires_at.isoformat() if expires_at else None
            },
            session=session
        )
        
        return blacklist
    
    def remove_device_blacklist(self, device_fingerprint: str) -> bool:
        """Remove device from blacklist"""
        result = self.db.query(DeviceBlacklist).filter(
            DeviceBlacklist.device_fingerprint == device_fingerprint
        ).delete()
        
        self.db.commit()
        return result > 0
    
    def get_session_stats(self, user_uid: str) -> Dict[str, Any]:
        """Get session statistics for a user"""
        
        total_sessions = self.db.query(UserSession).filter(
            UserSession.user_uid == user_uid
        ).count()
        
        active_sessions = self.db.query(UserSession).filter(
            UserSession.user_uid == user_uid,
            UserSession.is_active == True
        ).count()
        
        # Unique devices in last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        unique_devices = self.db.query(UserSession.device_fingerprint).filter(
            UserSession.user_uid == user_uid,
            UserSession.login_at >= thirty_days_ago
        ).distinct().count()
        
        # Most used device type
        most_used = self.db.query(
            UserSession.device_type,
            func.count(UserSession.id).label('count')
        ).filter(
            UserSession.user_uid == user_uid
        ).group_by(UserSession.device_type).order_by(desc('count')).first()
        
        # Average session duration for completed sessions
        avg_duration = self.db.query(
            func.avg(
                func.extract('epoch', UserSession.logout_at - UserSession.login_at) / 3600
            )
        ).filter(
            UserSession.user_uid == user_uid,
            UserSession.logout_at != None
        ).scalar() or 0
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "active_devices": active_sessions,
            "sessions_today": self.db.query(UserSession).filter(
                UserSession.user_uid == user_uid,
                func.date(UserSession.login_at) == datetime.now(timezone.utc).date()
            ).count(),
            "unique_devices_last_30_days": unique_devices,
            "most_used_device": most_used[0] if most_used else None,
            "average_session_duration_hours": round(avg_duration, 2)
        }
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions"""
        expired_count = self.db.query(UserSession).filter(
            UserSession.expires_at < datetime.now(timezone.utc),
            UserSession.is_active == True
        ).update({"is_active": False, "logout_at": datetime.now(timezone.utc)})
        
        self.db.commit()
        return expired_count


def get_activity_service(db: Session = Depends(get_db)) -> UserActivityService:
    """Dependency to get activity service instance"""
    return UserActivityService(db)