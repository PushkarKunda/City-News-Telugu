import os
import json
import base64
import logging

try:
    import firebase_admin
    from firebase_admin import credentials, auth
    FIREBASE_AVAILABLE = True
except ImportError:
    firebase_admin = None
    credentials = None
    auth = None
    FIREBASE_AVAILABLE = False

logger = logging.getLogger(__name__)

_firebase_app = None


def init_firebase():
    """Initialize Firebase Admin SDK (supports both local and production)"""
    global _firebase_app
    
    if not FIREBASE_AVAILABLE:
        logger.warning("firebase-admin is not installed; Firebase auth is disabled")
        return None
    
    if _firebase_app:
        return _firebase_app
    
    try:
        # Option 1: Base64 credentials (Production - Railway)
        creds_base64 = os.getenv("FIREBASE_CREDENTIALS_BASE64")
        if creds_base64:
            logger.info("Initializing Firebase from BASE64 credentials")
            creds_json = base64.b64decode(creds_base64).decode('utf-8')
            creds_dict = json.loads(creds_json)
            cred = credentials.Certificate(creds_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase initialized successfully (BASE64)")
            return _firebase_app
        
        # Option 2: File path (Local Development)
        creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")
        creds_path = os.path.expandvars(creds_path.strip().strip('"').strip("'"))
        if not os.path.isabs(creds_path):
            creds_path = os.path.abspath(creds_path)

        creds_exists = os.path.exists(creds_path)
        logger.info(
            "Firebase credentials path resolved: %s (exists=%s)",
            creds_path,
            creds_exists,
        )

        if creds_exists:
            logger.info(f"Initializing Firebase from file: {creds_path}")
            cred = credentials.Certificate(creds_path)
            try:
                _firebase_app = firebase_admin.initialize_app(cred)
            except ValueError as exc:
                if "already exists" in str(exc):
                    _firebase_app = firebase_admin.get_app()
                else:
                    raise
            logger.info("✅ Firebase initialized successfully (File)")
            return _firebase_app
        
        # Option 3: JSON string directly
        creds_json_str = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if creds_json_str:
            logger.info("Initializing Firebase from JSON string")
            creds_dict = json.loads(creds_json_str)
            cred = credentials.Certificate(creds_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase initialized successfully (JSON string)")
            return _firebase_app
        
        raise ValueError("No Firebase credentials found. Set FIREBASE_CREDENTIALS_BASE64, FIREBASE_CREDENTIALS_JSON, or provide credentials file.")
        
    except Exception as e:
        logger.error(f"❌ Firebase initialization failed: {str(e)}")
        return None


def verify_firebase_token(id_token: str) -> dict:
    """Verify Firebase ID token and return user information"""
    app = init_firebase()
    if not app:
        raise ValueError("Firebase Admin SDK not initialized")
    
    try:
        decoded_token = auth.verify_id_token(id_token)
        return {
            "uid": decoded_token.get("uid"),
            "phone_number": decoded_token.get("phone_number"),
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture"),
            "is_verified": True
        }
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise ValueError(f"Invalid Firebase token: {str(e)}")


def verify_firebase_token_optional(id_token: str = None) -> dict:
    """Verify Firebase token if provided, return None otherwise"""
    if not id_token:
        return None
    try:
        return verify_firebase_token(id_token)
    except:
        return None