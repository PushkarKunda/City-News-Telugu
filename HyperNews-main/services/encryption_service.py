# services/encryption_service.py
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


class EncryptionService:
    """Service for encrypting sensitive data"""
    
    def __init__(self):
        self.key = self._get_or_create_key()
        self.cipher = Fernet(self.key)
    
    def _get_or_create_key(self) -> bytes:
        """Get encryption key from env or generate new one"""
        key_str = os.getenv("ENCRYPTION_KEY")
        
        if key_str:
            return key_str.encode()
        
        # Generate deterministic key from settings.SECRET_KEY
        from config.settings import settings
        secret = os.getenv("SECRET_KEY") or settings.SECRET_KEY
        if not secret:
            if settings.is_production:
                raise ValueError("SECRET_KEY must be set for encryption in production")
            secret = "hypernews-default-dev-encryption-key-min-32-chars"
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"hypernews_salt_2024",
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
        
        if not settings.is_production:
            logger.debug("ENCRYPTION_KEY not set, using key derived from SECRET_KEY")
        return key
    
    def encrypt(self, data: str) -> str:
        """Encrypt sensitive data"""
        if not data:
            return None
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        if not encrypted_data:
            return None
        return self.cipher.decrypt(encrypted_data.encode()).decode()
    
    def encrypt_dict(self, data: dict) -> dict:
        """Encrypt sensitive fields in a dictionary"""
        sensitive_fields = ['api_key', 'secret', 'password', 'token', 'affiliate_key']
        result = data.copy()
        
        for key, value in result.items():
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                if value and isinstance(value, str):
                    result[key] = self.encrypt(value)
        
        return result
    
    def decrypt_dict(self, data: dict) -> dict:
        """Decrypt sensitive fields in a dictionary"""
        sensitive_fields = ['api_key', 'secret', 'password', 'token', 'affiliate_key']
        result = data.copy()
        
        for key, value in result.items():
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                if value and isinstance(value, str):
                    try:
                        result[key] = self.decrypt(value)
                    except:
                        pass
        
        return result


encryption_service = EncryptionService()
