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
        firebase_info = decoded_token.get("firebase", {})
        sign_in_provider = firebase_info.get("sign_in_provider")
        identities = firebase_info.get("identities", {})

        google_ids = identities.get("google.com", [])
        google_id = google_ids[0] if google_ids else None
        if not google_id and (sign_in_provider == "google.com" or (sign_in_provider and "google" in sign_in_provider)):
            google_id = decoded_token.get("uid")

        providers = []
        for p in identities.keys():
            if p == "google.com":
                providers.append("google")
            elif p == "phone":
                providers.append("phone")
            elif p == "password":
                providers.append("email")
            else:
                providers.append(p)
        if (sign_in_provider == "google.com" or google_id) and "google" not in providers:
            providers.append("google")

        is_email_verified = bool(decoded_token.get("email_verified", False))
        if google_id or sign_in_provider == "google.com":
            is_email_verified = True

        phone_verified = bool(decoded_token.get("phone_number"))

        return {
            "uid": decoded_token.get("uid"),
            "user_id": decoded_token.get("uid"),
            "phone_number": decoded_token.get("phone_number"),
            "phone_number_verified": phone_verified,
            "email": decoded_token.get("email"),
            "email_verified": is_email_verified,
            "name": decoded_token.get("name"),
            "picture": decoded_token.get("picture"),
            "sign_in_provider": sign_in_provider,
            "google_id": google_id,
            "providers": providers,
            "firebase": firebase_info,
            "decoded_token": decoded_token,
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