# =============================
# Standard Library
# =============================
from datetime import date, datetime, timedelta, timezone
from operator import and_
import random
import logging
from typing import List, Optional, Union
import os
import logging
from starlette.requests import Request
# =============================
# FastAPI
# =============================
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, logger, status
from fastapi.responses import JSONResponse, StreamingResponse

# =============================
# Database
# =============================
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_, and_

# =============================
# Auth / JWT
# =============================
from jose import jwt
from auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    create_password_reset_token,
    decode_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
    ALGORITHM,
    pwd_context,
    get_password_hash,
    verify_password
)
from jose.exceptions import ExpiredSignatureError, JWTClaimsError
from auth.dependencies import admin_required, get_current_user, require_role, require_permission
from auth.rbac import Permission, Role
from auth.google_oauth import oauth
from services.audit_service import record_audit_log

# =============================
# Project Utilities
# =============================
from database import get_db
from config.settings import settings
from utility import (
    generate_otp,
    generate_user_uid,
    generate_username,
    generate_unique_username
)

import schemas
# =============================
# Models
# =============================
from models.user import User, OTPStore, UserPreference, DeviceToken
from models.news import News, Category
from models.engagement import Notification
from models.base_location import City, District, State, Language
from models.post import Post
from models.follow import Follow
from models.rewards import UserRewards, UserTransaction
from services.firebase_auth import verify_firebase_token
from services.avatar_service import get_avatar_for_user
from schemas import UserRole, FirebaseLoginRequest

router = APIRouter(prefix="/user", tags=["User"])
# =====================================================
# HELPER FUNCTIONS (Moved to top for reusability)
# =====================================================

def _get_utc_now() -> datetime:
    """Get timezone-aware UTC datetime"""
    return datetime.now(timezone.utc)


def _get_role_name(role: int) -> str:
    """Convert role number to name"""
    role_names = {
        0: "guest",
        1: "user",
        2: "publisher",
        3: "moderator",
        4: "employee",
        5: "admin"
    }
    return role_names.get(role, "unknown")


def _calculate_profile_completion(user: User) -> int:
    """Calculate profile completion percentage"""
    fields = [
        user.user_name,
        user.name,
        user.email,
        user.phone,
        user.gender,
        user.date_of_birth,
        user.language,
        user.state_id,
        user.district_id,
        user.city_id
    ]
    completed = sum(1 for f in fields if f)
    return int((completed / len(fields)) * 100)

def _get_post_status(news) -> str:
    """Get human-readable post status"""
    if news.is_approved == 1:
        return "approved"
    elif news.rejected_at:
        return "rejected"
    else:
        return "pending"


def _get_quick_actions(user: User) -> list:
    """Get quick actions based on user role and profile completion"""
    actions = [
        {"label": "Create News", "url": "/news/create", "icon": "plus", "type": "primary"}
    ]
    
    if user.role == 2:  # PUBLISHER
        actions.append({"label": "View Analytics", "url": "/analytics", "icon": "chart", "type": "secondary"})
    
    if not user.email_verified:
        actions.append({"label": "Verify Email", "url": "/verify-email", "icon": "mail", "type": "warning"})
    
    if not user.mobile_verified:
        actions.append({"label": "Verify Mobile", "url": "/verify-mobile", "icon": "phone", "type": "warning"})
    
    if _calculate_profile_completion(user) < 80:
        actions.append({"label": "Complete Profile", "url": "/profile/edit", "icon": "user", "type": "info"})
    
    return actions

# routes/user_routes.py - ADD THIS HELPER FUNCTION

def validate_location_relation(state_id: Optional[int], district_id: Optional[int], city_id: Optional[int], db: Session):
    """
    Validate that:
    - If district is selected, it belongs to the selected state
    - If city is selected, it belongs to the selected district
    """
    
    # Validate district belongs to state
    if state_id and district_id:
        district = db.query(District).filter(
            District.id == district_id,
            District.state_id == state_id
        ).first()
        if not district:
            raise HTTPException(
                status_code=400,
                detail=f"District ID {district_id} does not belong to State ID {state_id}"
            )
    
    # Validate city belongs to district
    if district_id and city_id:
        city = db.query(City).filter(
            City.id == city_id,
            City.district_id == district_id
        ).first()
        if not city:
            raise HTTPException(
                status_code=400,
                detail=f"City ID {city_id} does not belong to District ID {district_id}"
            )
    
    # Also validate if state and city are selected without district
    if state_id and city_id and not district_id:
        city = db.query(City).filter(
            City.id == city_id,
            City.state_id == state_id
        ).first()
        if not city:
            raise HTTPException(
                status_code=400,
                detail=f"City ID {city_id} does not belong to State ID {state_id}"
            )
    
    return True

# routes/user_routes.py - UPDATE _create_or_update_preference function

def _create_or_update_preference(
    user_uid: str,
    pref: Union[schemas.UserPreferenceCreateMe, schemas.UserPreferenceUpdateMe],
    db: Session,
    is_create: bool = True
) -> schemas.UserPreferenceResponse:
    """Helper function to create or update user preferences"""
    
    # 1️⃣ Check language
    language = db.query(Language).filter(Language.id == pref.language_id).first()
    if not language:
        raise HTTPException(status_code=404, detail="Language not found")
    
    lang_code = language.code.lower()
    
    # 2️⃣ Language validation rules
    if lang_code == "te":  # Telugu
        if not (pref.state_id and pref.district_id and pref.city_id):
            raise HTTPException(
                status_code=400,
                detail="Telugu language requires state, district, and city preferences"
            )
    elif lang_code == "hi":  # Hindi
        if not pref.state_id:
            raise HTTPException(
                status_code=400,
                detail="Hindi language requires state preference"
            )
        pref.district_id = None
        pref.city_id = None
    elif lang_code == "en":  # English
        pref.state_id = None
        pref.district_id = None
        pref.city_id = None
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language.name}. Supported: Telugu (te), Hindi (hi), English (en)"
        )
    
    # 3️⃣ Validate categories
    categories = []
    if pref.category_ids:
        categories = db.query(Category).filter(Category.id.in_(pref.category_ids)).all()
        if len(categories) != len(pref.category_ids):
            found_ids = [c.id for c in categories]
            missing_ids = set(pref.category_ids) - set(found_ids)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category IDs: {missing_ids}"
            )
    
    # 4️⃣ ✅ VALIDATE LOCATION RELATIONS (ADD THIS)
    if pref.state_id or pref.district_id or pref.city_id:
        validate_location_relation(pref.state_id, pref.district_id, pref.city_id, db)
    
    # 5️⃣ Get or create preference object
    user_pref = db.query(UserPreference).filter(
        UserPreference.user_uid == user_uid
    ).first()
    
    if user_pref and not is_create:
        # Update existing
        user_pref.language_id = pref.language_id
        user_pref.state_id = pref.state_id
        user_pref.district_id = pref.district_id
        user_pref.city_id = pref.city_id
        user_pref.categories = categories
        user_pref.updated_at = _get_utc_now()
    else:
        # Create new
        user_pref = UserPreference(
            user_uid=user_uid,
            language_id=pref.language_id,
            state_id=pref.state_id,
            district_id=pref.district_id,
            city_id=pref.city_id,
            created_at=_get_utc_now(),
            updated_at=_get_utc_now(),
        )
        user_pref.categories = categories
        db.add(user_pref)
    
    db.commit()
    db.refresh(user_pref)
    
    # Get names for response
    language = db.query(Language).filter(Language.id == user_pref.language_id).first()
    lang_code = language.code if language else None
    lang_name = language.name if language else None
    
    state = None
    district = None
    city = None
    
    if user_pref.state_id:
        state = db.query(State).filter(State.id == user_pref.state_id).first()
    if user_pref.district_id:
        district = db.query(District).filter(District.id == user_pref.district_id).first()
    if user_pref.city_id:
        city = db.query(City).filter(City.id == user_pref.city_id).first()
    
    categories_with_names = []
    category_ids = []
    
    for cat in user_pref.categories:
        categories_with_names.append({
            "id": cat.id,
            "name": cat.name,
            "slug": getattr(cat, 'slug', None)
        })
        category_ids.append(cat.id)
    
    return schemas.UserPreferenceResponse(
        user_uid=user_pref.user_uid,
        language=lang_code,
        language_name=lang_name,
        state_id=user_pref.state_id,
        state_name=state.name if state else None,
        district_id=user_pref.district_id,
        district_name=district.name if district else None,
        city_id=user_pref.city_id,
        city_name=city.name if city else None,
        categories=categories_with_names,
        category_ids=category_ids,
        created_at=user_pref.created_at,
        updated_at=user_pref.updated_at,
    )

logger = logging.getLogger(__name__)
# =====================================================
# AUTHENTICATION ENDPOINTS
# =====================================================
# routes/user_routes.py - Add test endpoint (remove in production)


# routes/user_routes.py - REPLACE your old firebase_login with this

# routes/user_routes.py - COMPLETE UPDATED API

  # Add this import at the top

@router.post("/auth/firebase/login1", tags=["Auth"])
async def firebase_login(
    request_data: FirebaseLoginRequest,  # ✅ Changed from 'request: Request'
    db: Session = Depends(get_db)
):
    """
    Login using Firebase ID token (Phone OTP, Email OTP, or Google OAuth)
    
    Features:
    - Detects new vs existing users
    - Creates user with unique user_uid and username
    - Stores firebase_uid for reliable identification
    - Tracks verification status from Firebase
    - Returns reporter eligibility info
    
    Request Body:
    {
        "firebase_token": "string"  # Required - Firebase ID token
    }
    """
    try:
        # ✅ Get token from Pydantic model (no manual JSON parsing needed)
        firebase_token = request_data.firebase_token
        
        if not firebase_token:
            raise HTTPException(status_code=400, detail="firebase_token required")
        
        # Verify Firebase token
        firebase_user = verify_firebase_token(firebase_token)
        
        # Extract ALL user information from Firebase
        phone = firebase_user.get("phone_number")
        email = firebase_user.get("email")
        name = firebase_user.get("name")
        email_verified = firebase_user.get("email_verified", False)
        phone_verified = firebase_user.get("phone_number_verified", False)
        firebase_uid = firebase_user.get("user_id")
        photo_url = firebase_user.get("picture")
        
        # =========================================================
        # FIND EXISTING USER (Priority: Firebase UID > Phone > Email)
        # =========================================================
        user = None
        
        # 1️⃣ Try by Firebase UID (most reliable)
        if firebase_uid:
            user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        
        # 2️⃣ Try by phone
        if not user and phone:
            user = db.query(User).filter(User.phone == phone).first()
        
        # 3️⃣ Try by email
        if not user and email:
            user = db.query(User).filter(User.email == email).first()
        
        is_new_user = False
        verification_added = False
        
        # =========================================================
        # CREATE NEW USER
        # =========================================================
        if not user:
            # Generate unique IDs
            user_uid = generate_user_uid(db)
            user_name = generate_unique_username(db)
            
            user = User(
                user_uid=user_uid,
                user_name=user_name,
                firebase_uid=firebase_uid,
                phone=phone,
                email=email,
                name=name or (email or phone),
                profile_picture=photo_url,
                role=UserRole.USER,  # Role 1 - Regular user
                mobile_verified=bool(phone and phone_verified),
                email_verified=bool(email and email_verified),
                created_at=_get_utc_now(),
                token_version=0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            is_new_user = True
        
        # =========================================================
        # UPDATE EXISTING USER (New verification from Firebase)
        # =========================================================
        else:
            updated = False
            
            # Update Firebase UID if not set
            if not user.firebase_uid and firebase_uid:
                user.firebase_uid = firebase_uid
                updated = True
            
            # Update phone if newly provided
            if phone and not user.phone:
                user.phone = phone
                updated = True
            
            # Update email if newly provided
            if email and not user.email:
                user.email = email
                updated = True
            
            # Update verification status from Firebase
            if phone_verified and not user.mobile_verified:
                user.mobile_verified = True
                updated = True
                verification_added = True
            
            if email_verified and not user.email_verified:
                user.email_verified = True
                updated = True
                verification_added = True
            
            # Update name if not set
            if name and not user.name:
                user.name = name
                updated = True
            
            # Update profile picture if not set
            if photo_url and not user.profile_picture:
                user.profile_picture = photo_url
                updated = True
            
            if updated:
                user.updated_at = _get_utc_now()
                db.commit()
                db.refresh(user)
        
        # Update last login
        user.last_login = _get_utc_now()
        db.commit()
        
        # =========================================================
        # CHECK REPORTER ELIGIBILITY (Role 2)
        # =========================================================
        
        can_become_reporter = False
        reporter_requirements = []
        
        if user.role == UserRole.USER:  # Role 1
            if not user.email_verified:
                reporter_requirements.append({
                    "field": "email",
                    "status": "not_verified",
                    "message": "Email verification required"
                })
            if not user.mobile_verified:
                reporter_requirements.append({
                    "field": "phone",
                    "status": "not_verified",
                    "message": "Phone verification required"
                })
            if not user.name:
                reporter_requirements.append({
                    "field": "name",
                    "status": "missing",
                    "message": "Full name required"
                })
            if not user.date_of_birth:
                reporter_requirements.append({
                    "field": "date_of_birth",
                    "status": "missing",
                    "message": "Date of birth required"
                })
            if not user.gender:
                reporter_requirements.append({
                    "field": "gender",
                    "status": "missing",
                    "message": "Gender required"
                })
            
            can_become_reporter = len(reporter_requirements) == 0
        
        # =========================================================
        # GENERATE JWT TOKENS
        # =========================================================
        token_data = {"sub": str(user.user_uid), "role": user.role}
        access_token = create_access_token(data=token_data, token_version=user.token_version)
        refresh_token = create_refresh_token(data=token_data)
        
        # =========================================================
        # COMPLETE RESPONSE
        # =========================================================
        return {
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "user_uid": user.user_uid,
                "user_name": user.user_name,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "email_verified": user.email_verified,
                "mobile_verified": user.mobile_verified,
                "profile_picture": user.profile_picture,
                "role": user.role,
                "role_name": schemas.user_role_label(user.role),
                "is_new_user": is_new_user
            },
            "verification_added": verification_added,
            "reporter_eligibility": {
                "can_become_reporter": can_become_reporter,
                "requirements": reporter_requirements,
                "switch_endpoint": "POST /auth/switch-to-publisher"
            }
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Firebase token error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Firebase login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
    
# routes/user_routes.py - COMPLETE FIXED VERSION

# routes/user_routes.py - FIXED VERSION

@router.post("/auth/firebase/login", tags=["Auth"])
async def firebase_login(
    request_data: FirebaseLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login using Firebase ID token (Phone OTP, Email OTP, or Google OAuth)
    """
    try:
        firebase_token = request_data.firebase_token
        
        if not firebase_token:
            raise HTTPException(status_code=400, detail="firebase_token required")
        
        # Verify Firebase token
        firebase_user = verify_firebase_token(firebase_token)
        
        # Extract ALL user information from Firebase
        phone = firebase_user.get("phone_number")
        email = firebase_user.get("email")
        name = firebase_user.get("name")
        firebase_uid = firebase_user.get("user_id")
        photo_url = firebase_user.get("picture")
        
        # ✅ FIX: Use email_verified DIRECTLY from Firebase token
        # For Google Sign-In, Firebase token already has email_verified: true
        email_verified = firebase_user.get("email_verified", False)
        
        # ✅ Phone verification - if phone exists, it's verified
        phone_verified = True if phone else False
        
        # =========================================================
        # FIND EXISTING USER
        # =========================================================
        user = None
        
        # 1️⃣ Try by Firebase UID
        if firebase_uid:
            user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
        
        # 2️⃣ Try by phone
        if not user and phone:
            user = db.query(User).filter(User.phone == phone).first()
        
        # 3️⃣ Try by email
        if not user and email:
            user = db.query(User).filter(User.email == email).first()
        
        is_new_user = False
        verification_added = False
        
        # =========================================================
        # CREATE NEW USER
        # =========================================================
        if not user:
            user_uid = generate_user_uid(db)
            user_name = generate_unique_username(db)
            
            user = User(
                user_uid=user_uid,
                user_name=user_name,
                firebase_uid=firebase_uid,
                phone=phone,
                email=email,
                name=name or (email or phone),
                profile_picture=photo_url,
                role=UserRole.USER,
                mobile_verified=phone_verified,
                email_verified=email_verified,  # ✅ Now correctly set
                created_at=_get_utc_now(),
                token_version=0
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            is_new_user = True
        
        # =========================================================
        # UPDATE EXISTING USER
        # =========================================================
        else:
            updated = False
            
            if not user.firebase_uid and firebase_uid:
                user.firebase_uid = firebase_uid
                updated = True
            
            if phone and not user.phone:
                user.phone = phone
                updated = True
            
            if email and not user.email:
                user.email = email
                updated = True
            
            # ✅ Update verification statuses
            if phone and not user.mobile_verified:
                user.mobile_verified = True
                updated = True
                verification_added = True
            
            # ✅ email_verified comes DIRECTLY from Firebase token
            if email_verified and not user.email_verified:
                user.email_verified = True
                updated = True
                verification_added = True
            
            if name and not user.name:
                user.name = name
                updated = True
            
            if photo_url and not user.profile_picture:
                user.profile_picture = photo_url
                updated = True
            
            if updated:
                user.updated_at = _get_utc_now()
                db.commit()
                db.refresh(user)
        
        # Update last login
        user.last_login = _get_utc_now()
        db.commit()
        
        # =========================================================
        # CHECK PUBLISHER ELIGIBILITY
        # =========================================================
        
        can_become_publisher = False
        publisher_requirements = []
        
        if user.role == UserRole.USER:
            if not user.email_verified:
                publisher_requirements.append({
                    "field": "email",
                    "status": "not_verified",
                    "message": "Email verification required"
                })
            if not user.mobile_verified:
                publisher_requirements.append({
                    "field": "phone",
                    "status": "not_verified",
                    "message": "Phone verification required"
                })
            if not user.name:
                publisher_requirements.append({
                    "field": "name",
                    "status": "missing",
                    "message": "Full name required"
                })
            if not user.date_of_birth:
                publisher_requirements.append({
                    "field": "date_of_birth",
                    "status": "missing",
                    "message": "Date of birth required"
                })
            if not user.gender:
                publisher_requirements.append({
                    "field": "gender",
                    "status": "missing",
                    "message": "Gender required"
                })
            
            can_become_publisher = len(publisher_requirements) == 0
        
        # =========================================================
        # GENERATE JWT TOKENS
        # =========================================================
        token_data = {"sub": str(user.user_uid), "role": user.role}
        access_token = create_access_token(data=token_data, token_version=user.token_version)
        refresh_token = create_refresh_token(data=token_data)
        
        # =========================================================
        # COMPLETE RESPONSE
        # =========================================================
        return {
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "user_uid": user.user_uid,
                "user_name": user.user_name,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "email_verified": user.email_verified,  # ✅ Should be True for Google
                "mobile_verified": user.mobile_verified,
                "profile_picture": user.profile_picture,
                "role": user.role,
                "role_name": schemas.user_role_label(user.role),
                "is_new_user": is_new_user
            },
            "verification_added": verification_added,
            "publisher_eligibility": {
                "can_become_publisher": can_become_publisher,
                "requirements": publisher_requirements,
                "switch_endpoint": "POST /auth/switch-to-publisher"
            }
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Firebase token error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        db.rollback()
        logger.error(f"Firebase login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")
    
    
@router.get("/auth/firebase/test", tags=["Auth", "Testing"])
async def test_firebase_setup():
    """
    TEST ENDPOINT: Check if Firebase login setup is correct.
    This doesn't require authentication and just returns configuration status.
    
    Use this to verify your Firebase integration before actual login.
    """
    from services.firebase_auth import init_firebase
    
    config_status = {
        "firebase_configured": False,
        "message": "",
        "next_steps": []
    }
    
    # Check if Firebase is configured
    if init_firebase():
        config_status["firebase_configured"] = True
        config_status["message"] = "✅ Firebase is configured correctly"
        config_status["next_steps"] = [
            "1. Call POST /auth/firebase/login with valid firebase_token",
            "2. Use token from Firebase Client SDK (not from this API)",
            "3. For testing, use a real device or Firebase emulator"
        ]
    else:
        config_status["message"] = "❌ Firebase is NOT configured. Check your credentials."
        config_status["next_steps"] = [
            "1. Add FIREBASE_CREDENTIALS.json to your project",
            "2. Set FIREBASE_CREDENTIALS_PATH in .env",
            "3. Restart the server"
        ]
    
    # Check required environment variables
    import os
    config_status["env_checks"] = {
        "FIREBASE_CREDENTIALS_PATH": "✅ Set" if os.getenv("FIREBASE_CREDENTIALS_PATH") else "❌ Missing",
        "ENCRYPTION_KEY": "✅ Set" if os.getenv("ENCRYPTION_KEY") else "⚠️ Optional",
        "REDIS_URL": "✅ Set" if os.getenv("REDIS_URL") else "⚠️ Optional"
    }
    
    return config_status


# routes/user_routes.py - UPDATED test token API

# Add this import at the top
from schemas import FirebaseLoginRequest

@router.post("/auth/firebase/test-token", tags=["Auth", "Testing"])
async def test_firebase_token(
    request_data: FirebaseLoginRequest,  # ✅ Changed to match login API
    db: Session = Depends(get_db)
):
    """
    TEST ENDPOINT: Test a Firebase token and see what information it contains.
    
    This endpoint:
    1. Takes a firebase_token
    2. Verifies it with Firebase
    3. Returns the decoded user information (for debugging)
    4. Does NOT create or update users
    
    Use this to debug token issues before implementing full login.
    
    Request Body:
    {
        "firebase_token": "string"  # Required - Firebase ID token
    }
    """
    try:
        # ✅ Get token directly from Pydantic model
        firebase_token = request_data.firebase_token
        
        if not firebase_token:
            raise HTTPException(status_code=400, detail="firebase_token required")
        
        # Verify Firebase token
        from services.firebase_auth import verify_firebase_token
        firebase_user = verify_firebase_token(firebase_token)
        
        # Return decoded information (NO database changes)
        return {
            "success": True,
            "message": "Token is valid",
            "decoded_user_info": {
                "user_id": firebase_user.get("user_id"),
                "phone_number": firebase_user.get("phone_number"),
                "email": firebase_user.get("email"),
                "email_verified": firebase_user.get("email_verified", False),
                "phone_number_verified": firebase_user.get("phone_number_verified", False),
                "name": firebase_user.get("name"),
                "picture": firebase_user.get("picture"),
                "firebase": {
                    "sign_in_provider": firebase_user.get("firebase", {}).get("sign_in_provider"),
                    "identities": firebase_user.get("firebase", {}).get("identities", {})
                }
            },
            "note": "This is a test endpoint. No user was created or updated in database."
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Firebase token error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Test token error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")
# routes/user_routes.py - ADD THIS
# routes/user_routes.py - UPDATE THIS ENDPOINT

 
@router.post("/auth/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
def register_user(payload: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account with password."""
    identifier = payload.identifier.strip()
    is_email = "@" in identifier

    # Check for existing account
    existing = db.query(User).filter(
        (User.email == identifier) if is_email else (User.phone == identifier)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with this {'email' if is_email else 'phone'} already exists."
        )

    user_uid = generate_user_uid(db)
    username = generate_unique_username(db, payload.name or "User")

    hashed_pwd = get_password_hash(payload.password)

    new_user = User(
        user_uid=user_uid,
        user_name=username,
        name=payload.name,
        email=identifier if is_email else None,
        phone=identifier if not is_email else None,
        hashed_password=hashed_pwd,
        role=UserRole.USER,
        language=payload.language_code or "en",
        created_at=_get_utc_now()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token_data = {"sub": str(new_user.user_uid), "role": new_user.role}
    access_token = create_access_token(data=token_data, token_version=new_user.token_version)
    refresh_token = create_refresh_token(data=token_data)

    return schemas.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_expires_in=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        email=new_user.email or new_user.phone
    )


@router.post("/auth/login", response_model=schemas.TokenResponse, tags=["Auth"])
def login_with_password(payload: schemas.PasswordLoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email/phone and password."""
    identifier = payload.identifier.strip()
    user = db.query(User).filter(
        (User.email == identifier) | (User.phone == identifier) | (User.user_name == identifier)
    ).first()

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid identifier or password."
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid identifier or password."
        )

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is suspended: {user.suspension_reason or 'Policy violation'}"
        )

    user.last_login = _get_utc_now()
    db.commit()

    token_data = {"sub": str(user.user_uid), "role": user.role}
    access_token = create_access_token(data=token_data, token_version=user.token_version)
    refresh_token = create_refresh_token(data=token_data)

    return schemas.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_expires_in=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        email=user.email or user.phone
    )


@router.post("/token/verify/login", response_model=schemas.TokenResponse, tags=["Auth"])
def admin_or_otp_login(payload: schemas.AdminLoginRequest, db: Session = Depends(get_db)):
    """Verified OTP login for admin and users."""
    user = db.query(User).filter(
        (User.email == payload.identifier) | (User.phone == payload.identifier)
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail=f"User not found for {payload.identifier}")

    if str(user.role) != str(payload.role):
        raise HTTPException(status_code=403, detail="Role mismatch")

    if not payload.otp:
        raise HTTPException(status_code=400, detail="OTP is required for verification login")

    # Verify OTP against OTPStore
    otp_type = "email" if "@" in payload.identifier else "mobile"
    otp_entries = db.query(OTPStore).filter(
        OTPStore.type == otp_type,
        OTPStore.value == payload.identifier,
        OTPStore.expires_at >= _get_utc_now(),
        OTPStore.verified == False
    ).all()

    verified_entry = None
    for entry in otp_entries:
        if verify_password(payload.otp, entry.otp) or (entry.otp.isdigit() and hmac.compare_digest(payload.otp.strip(), entry.otp.strip())):
            verified_entry = entry
            break

    if not verified_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    verified_entry.verified = True
    user.last_login = _get_utc_now()
    db.commit()

    token_data = {"sub": str(user.user_uid), "role": user.role}
    access_token = create_access_token(data=token_data, token_version=user.token_version)
    refresh_token = create_refresh_token(data=token_data, token_version=user.token_version)

    return schemas.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_expires_in=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        email=user.email or user.phone
    )


@router.post("/auth/refresh", response_model=schemas.TokenResponse, tags=["Auth"])
def refresh_access_token(
    body: Optional[schemas.RefreshTokenRequest] = None,
    refresh_token: Optional[str] = Query(None, description="Legacy query parameter fallback"),
    db: Session = Depends(get_db)
):
    """
    Refresh access token with refresh-token rotation and token version revocation check.
    Supports JSON body payload with query parameter fallback.
    """
    token_str = (body.refresh_token.strip() if body and body.refresh_token else None) or (refresh_token.strip() if refresh_token else None)
    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="refresh_token must be provided in request body"
        )

    try:
        payload = decode_token(token_str, expected_type="refresh")
        user_uid: Optional[str] = payload.get("sub")
        token_version: int = payload.get("ver", 0)

        if not user_uid:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        user = db.query(User).filter(User.user_uid == user_uid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Check token revocation
        if user.token_version != token_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has been revoked. Please log in again."
            )

        # Check if user is suspended
        if user.is_suspended:
            if user.suspended_until and user.suspended_until > _get_utc_now():
                raise HTTPException(status_code=403, detail="Account is suspended")
            elif user.suspended_until and user.suspended_until <= _get_utc_now():
                # Auto-unsuspend if suspension expired
                user.is_suspended = False
                user.token_version += 1
                db.commit()

        token_data = {"sub": str(user.user_uid), "role": user.role}
        # Refresh token rotation: issue new access token and new rotated refresh token
        new_access_token = create_access_token(data=token_data, token_version=user.token_version)
        new_refresh_token = create_refresh_token(data=token_data, token_version=user.token_version)

        return schemas.TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            refresh_expires_in=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            email=user.email or user.phone
        )

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired")
    except JWTClaimsError as exc:
        raise HTTPException(status_code=401, detail=str(exc) or "Invalid token claims")
    except Exception as exc:
        logger.warning("Token refresh error: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


# =========================================================
# LOGOUT ENDPOINT
# =========================================================

@router.post("/auth/logout", tags=["Auth"])
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout user by invalidating all existing access and refresh tokens."""
    current_user.token_version += 1
    db.commit()

    record_audit_log(
        db=db,
        actor_uid=current_user.user_uid,
        action="USER_LOGOUT",
        resource_type="user",
        resource_id=current_user.user_uid,
        status="SUCCESS"
    )

    return {"message": "Successfully logged out. All active tokens have been revoked."}


# =========================================================
# PASSWORD RESET ENDPOINTS
# =========================================================

@router.post("/auth/password-reset/request", tags=["Auth"])
def request_password_reset(
    payload: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset token.
    In production, sends token via email/SMS. In development, returns token for verification.
    """
    identifier = payload.identifier.strip()
    user = db.query(User).filter(
        (User.email == identifier) | (User.phone == identifier)
    ).first()

    # Avoid user enumeration by returning uniform message
    if not user:
        return {
            "success": True,
            "message": "If an account exists with this identifier, password reset instructions have been generated."
        }

    reset_token = create_password_reset_token(user.user_uid, token_version=user.token_version)

    record_audit_log(
        db=db,
        actor_uid=user.user_uid,
        action="PASSWORD_RESET_REQUESTED",
        resource_type="user",
        resource_id=user.user_uid,
        status="SUCCESS"
    )

    response_data = {
        "success": True,
        "message": "Password reset instructions generated.",
    }
    # Expose token directly for local testing / non-production environments
    if not settings.is_production:
        response_data["reset_token"] = reset_token

    return response_data


@router.post("/auth/password-reset/confirm", tags=["Auth"])
def confirm_password_reset(
    payload: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm password reset using single-use signed token and set new password.
    Revokes all active sessions/tokens upon completion.
    """
    try:
        token_payload = decode_token(payload.token.strip(), expected_type="password_reset")
        user_uid: Optional[str] = token_payload.get("sub")
        token_version: int = token_payload.get("ver", 0)

        if not user_uid:
            raise HTTPException(status_code=400, detail="Invalid password reset token payload")

        user = db.query(User).filter(User.user_uid == user_uid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User account not found")

        if user.token_version != token_version:
            raise HTTPException(
                status_code=400,
                detail="Password reset token has expired or has already been used."
            )

        if len(payload.new_password.strip()) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters long."
            )

        user.hashed_password = get_password_hash(payload.new_password.strip())
        user.token_version += 1  # Invalidate all prior tokens and this reset token
        db.commit()

        record_audit_log(
            db=db,
            actor_uid=user.user_uid,
            action="PASSWORD_RESET_COMPLETED",
            resource_type="user",
            resource_id=user.user_uid,
            status="SUCCESS"
        )

        return {
            "success": True,
            "message": "Password has been successfully updated. Please login with your new credentials."
        }

    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Password reset token has expired")
    except Exception as exc:
        logger.warning("Password reset error: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token")


# =========================================================
# GOOGLE OAUTH ENDPOINTS (UPDATED)
# =========================================================

# @router.get("/auth/google/login", tags=["Auth"])
# async def google_login(request: Request):
#     """Initiate Google OAuth login"""
#     if not oauth:
#         raise HTTPException(status_code=503, detail="Google login is not configured")
    
#     redirect_uri = request.url_for("google_callback")
#     # print(f"🔐 Redirect URI being sent to Google: {redirect_uri}")  # Debug
    
#     return await oauth.google.authorize_redirect(
#         request,
#         redirect_uri,
#     )




 




# @router.get("/auth/google/callback", tags=["Auth"])
# async def google_callback(request: Request, db: Session = Depends(get_db)):
#     """Handle Google OAuth callback"""
#     if not oauth:
#         raise HTTPException(status_code=503, detail="Google login is not configured")
    
#     try:
#         # Exchange code for access token
#         token = await oauth.google.authorize_access_token(request)
#         user_info = token.get("userinfo")

#         if not user_info:
#             raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")

#         email = user_info.get("email")
#         name = user_info.get("name")
        
#         if not email:
#             raise HTTPException(status_code=400, detail="Email not provided by Google")

#         # Find or create user
#         user = db.query(User).filter(User.email == email).first()

#         if not user:
#             # Generate unique username
#             MAX_USERNAME_LEN = 18
            
#             base_username = name.lower().replace(" ", "_") if name else email.split('@')[0]
#             base_username = ''.join(c for c in base_username if c.isalnum() or c == '_')
            
#             max_base_len = MAX_USERNAME_LEN - 5
#             if len(base_username) > max_base_len:
#                 base_username = base_username[:max_base_len]
            
#             username = base_username
#             counter = 1
            
#             while db.query(User).filter(User.user_name == username).first():
#                 suffix = random.randint(1000, 9999)
#                 username = f"{base_username}_{suffix}"
#                 if len(username) > MAX_USERNAME_LEN:
#                     available = MAX_USERNAME_LEN - len(f"_{suffix}")
#                     if available > 0:
#                         base_username = base_username[:available]
#                         username = f"{base_username}_{suffix}"
#                     else:
#                         username = f"u{suffix}"[:MAX_USERNAME_LEN]
                
#                 counter += 1
#                 if counter > 20:
#                     username = f"u{int(_get_utc_now().timestamp())}"[:MAX_USERNAME_LEN]
#                     break
            
#             if len(username) > MAX_USERNAME_LEN:
#                 username = username[:MAX_USERNAME_LEN]
            
#             user_uid = generate_user_uid(db)
            
#             user = User(
#                 user_uid=user_uid,
#                 user_name=username,
#                 name=name,
#                 email=email,
#                 role=UserRole.USER,
#                 email_verified=True,
#                 token_version=0,
#                 created_at=_get_utc_now(),
#                 # updated_at=_get_utc_now()
#             )
#             db.add(user)
#             db.commit()
#             db.refresh(user)
            
#             logger.info(f"New user created via Google OAuth: {email}")

#         # Update last login
#         user.last_login = _get_utc_now()
#         db.commit()

#         # Generate JWT tokens
#         token_data = {"sub": str(user.user_uid), "role": user.role}
#         access_token = create_access_token(data=token_data, token_version=user.token_version)
#         refresh_token = create_refresh_token(data=token_data)

#         # Return response
#         return {
#             "success": True,
#             "message": "Google login successful",
#             "access_token": access_token,
#             "refresh_token": refresh_token,
#             "token_type": "bearer",
#             "user_uid": user.user_uid,
#             "user_name": user.user_name,
#             "email": user.email
#         }
        
#     except HTTPException:
#         raise
#     except Exception as e:
#         db.rollback()
#         # ✅ Fixed: Use logger (imported at top) instead of fastapi.logger
#         logger.error(f"Google login error: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Google login failed: {str(e)}")

# routes/user_routes.py - Add/Update these endpoints


@router.get("/users/me/publisher-eligibility", tags=["User"])
def check_publisher_eligibility(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check if current user can become a publisher.
    
    IMPORTANT: Email and Phone verification is handled by Firebase.
    Your backend only READS the verification status from the user record.
    
    When user verifies email/phone in Firebase:
    1. Firebase updates its internal record
    2. User refreshes token (or next login)
    3. Your backend gets updated verification status
    4. This API will show updated status
    """
    
    if current_user.role == UserRole.PUBLISHER:
        return {
            "is_eligible": True,
            "is_already_publisher": True,
            "message": "You are already a publisher"
        }
    
    if current_user.role != UserRole.USER:
        return {
            "is_eligible": False,
            "is_already_publisher": False,
            "message": f"Only users can become publishers. Your role: {current_user.role}"
        }
    
    missing = []
    
    # ✅ Firebase handles these - we just read the status
    if not current_user.email_verified:
        missing.append({
            "field": "email",
            "status": "not_verified",
            "message": "Email address is not verified",
            "action": "Verify your email using Firebase Auth",
            "how_to_fix": "Use Firebase SDK: auth().currentUser.sendEmailVerification()"
        })
    
    if not current_user.mobile_verified:
        missing.append({
            "field": "phone",
            "status": "not_verified",
            "message": "Phone number is not verified",
            "action": "Verify your phone using Firebase Auth",
            "how_to_fix": "Use Firebase SDK: auth().signInWithPhoneNumber()"
        })
    
    # ✅ Profile fields - these use your backend APIs
    if not current_user.name:
        missing.append({
            "field": "name",
            "status": "missing",
            "message": "Full name is required",
            "action": "Add your name",
            "endpoint": "PATCH /users/me"
        })
    
    if not current_user.date_of_birth:
        missing.append({
            "field": "date_of_birth",
            "status": "missing",
            "message": "Date of birth is required",
            "action": "Add date of birth",
            "endpoint": "PATCH /users/me"
        })
    
    if not current_user.gender:
        missing.append({
            "field": "gender",
            "status": "missing",
            "message": "Gender is required",
            "action": "Select gender",
            "endpoint": "PATCH /users/me"
        })
    
    return {
        "is_eligible": len(missing) == 0,
        "missing_requirements": missing,
        "completed_requirements": {
            "email_verified": current_user.email_verified,
            "mobile_verified": current_user.mobile_verified,
            "name_filled": bool(current_user.name),
            "dob_filled": bool(current_user.date_of_birth),
            "gender_filled": bool(current_user.gender)
        },
        "switch_endpoint": "POST /auth/switch-to-publisher",
        "note": "Email and phone verification is handled by Firebase. Use Firebase SDK to verify."
    }


@router.post("/auth/switch-to-publisher", tags=["Auth"])
def switch_to_publisher(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Switch from USER (Role 1) to PUBLISHER (Role 2)
    
    Requirements before switching:
    ✅ Email must be verified (from Firebase)
    ✅ Phone must be verified (from Firebase)
    ✅ Name must be filled
    ✅ Date of birth must be filled
    ✅ Gender must be selected
    """
    
    # Check current role
    if current_user.role == UserRole.PUBLISHER:
        return {
            "success": True,
            "message": "You are already a publisher",
            "role": current_user.role,
            "role_name": "publisher"
        }
    
    if current_user.role != UserRole.USER:
        raise HTTPException(
            status_code=403, 
            detail=f"Only users (Role 1) can switch to publisher. Current role: {current_user.role}"
        )
    
    # =========================================================
    # CHECK ALL REQUIREMENTS (Reading from database)
    # These values come from Firebase during login/token refresh
    # =========================================================
    
    missing_requirements = []
    
    # 1. Email verification (from Firebase)
    if not current_user.email_verified:
        missing_requirements.append({
            "field": "email",
            "message": "Email not verified",
            "action": "Verify your email using Firebase Auth",
            "firebase_method": "auth().currentUser.sendEmailVerification()"
        })
    
    # 2. Phone verification (from Firebase)
    if not current_user.mobile_verified:
        missing_requirements.append({
            "field": "phone",
            "message": "Phone not verified",
            "action": "Verify your phone using Firebase Auth",
            "firebase_method": "auth().signInWithPhoneNumber()"
        })
    
    # 3. Name (Profile - Your backend)
    if not current_user.name:
        missing_requirements.append({
            "field": "name",
            "message": "Name missing",
            "action": "Add your full name",
            "endpoint": "PATCH /users/me"
        })
    
    # 4. Date of birth (Profile - Your backend)
    if not current_user.date_of_birth:
        missing_requirements.append({
            "field": "date_of_birth",
            "message": "Date of birth missing",
            "action": "Add your date of birth",
            "endpoint": "PATCH /users/me"
        })
    
    # 5. Gender (Profile - Your backend)
    if not current_user.gender:
        missing_requirements.append({
            "field": "gender",
            "message": "Gender missing",
            "action": "Select your gender",
            "endpoint": "PATCH /users/me"
        })
    
    # If requirements missing, return error with details
    if missing_requirements:
        raise HTTPException(
            status_code=400,
            detail={
                "error": True,
                "message": "Cannot switch to publisher. Complete required fields first.",
                "missing_requirements": missing_requirements,
                "action_required": "Complete profile and verify email/phone using Firebase"
            }
        )
    
    # =========================================================
    # SWITCH TO PUBLISHER
    # =========================================================
    
    current_user.role = UserRole.PUBLISHER
    current_user.token_version += 1  # Invalidate old tokens
    current_user.updated_at = _get_utc_now()
    current_user.switched_at = _get_utc_now()
    
    db.commit()
    db.refresh(current_user)
    
    # Generate new tokens with updated role
    token_data = {"sub": str(current_user.user_uid), "role": current_user.role}
    new_access_token = create_access_token(data=token_data, token_version=current_user.token_version)
    new_refresh_token = create_refresh_token(data=token_data)
    
    return {
        "success": True,
        "message": "🎉 Congratulations! You are now a publisher. You can now publish news.",
        "role": current_user.role,
        "role_name": "publisher",
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }
from services.otp_service import OTPService, otp_service, get_otp_service
@router.post("/auth/send-otp-testing", tags=["Auth"])
def send_otp(request: schemas.SendOtpRequest, db: Session = Depends(get_db)):
    """
    Sends OTP to the user's provided contact (email/phone).
    """
    # Validate input
    if request.type not in ["email", "mobile"]:
        raise HTTPException(status_code=400, detail="Type must be 'email' or 'mobile'")
    
    if not request.value:
        raise HTTPException(status_code=400, detail="Value cannot be empty")
    
    # Generate 6-digit OTP
    otp_code = generate_otp()  # Now returns 6 digits
    hashed_otp = pwd_context.hash(otp_code)
    
    # Clean up old unverified OTPs
    db.query(OTPStore).filter(
        OTPStore.type == request.type,
        OTPStore.value == request.value,
        OTPStore.verified == False
    ).delete()
    
    # Store new OTP
    new_otp = OTPStore(
        type=request.type,
        value=request.value,
        otp=hashed_otp,
        verified=False,
        created_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    
    db.add(new_otp)
    db.commit()
    
    return {
        "message": f"OTP sent successfully to {request.value}",
        "otp": otp_code,  # 6-digit OTP
        "expires_in": 300,
        "type": request.type
    }

#-------------------------------------------------------------------------------------------------USER VERIFY OTP------------------

@router.post("/auth/verify-otp-testing", tags=["Auth"])
def verify_otp(payload: schemas.VerifyOtp, db: Session = Depends(get_db)):
    """
    Verify OTP and login/register user
    """
    # Find valid OTP entries
    otp_entries = db.query(OTPStore).filter(
        OTPStore.type == payload.type,
        OTPStore.value == payload.value,
        OTPStore.expires_at >= datetime.utcnow(),
        OTPStore.verified == False
    ).all()
    
    # Verify OTP using bcrypt
    matched_entry = None
    for entry in otp_entries:
        if pwd_context.verify(payload.otp, entry.otp):
            matched_entry = entry
            break
    
    if not matched_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Mark OTP as verified
    matched_entry.verified = True
    db.commit()
    
    # Check if user already exists
    existing_user = None
    if payload.type == "mobile":
        existing_user = db.query(User).filter(User.phone == payload.value).first()
    else:
        existing_user = db.query(User).filter(User.email == payload.value).first()
    
    is_new_user = False
    
    if not existing_user:
        # Create new user
        user_uid = generate_user_uid(db)
        user_name = generate_unique_username(db)
        
        # ✅ FIX: Convert enum to integer value
        new_user = User(
            user_uid=user_uid,
            user_name=user_name,
            phone=payload.value if payload.type == "mobile" else None,
            email=payload.value if payload.type == "email" else None,
            role=schemas.UserRole.USER.value,  # ✅ Use .value to get integer
            mobile_verified=True if payload.type == "mobile" else False,
            email_verified=True if payload.type == "email" else False,
            created_at=datetime.utcnow(),
            token_version=0
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user_uid = new_user.user_uid
        is_new_user = True
    else:
        # Update existing user verification status
        if payload.type == "mobile":
            if not existing_user.phone:
                existing_user.phone = payload.value
            existing_user.mobile_verified = True
        else:
            if not existing_user.email:
                existing_user.email = payload.value
            existing_user.email_verified = True
        db.commit()
        user_uid = existing_user.user_uid
    
    # Get the final user object
    user = db.query(User).filter(User.user_uid == user_uid).first()
    
    # Generate tokens
    token_data = {"sub": str(user.user_uid), "role": user.role}
    access_token = create_access_token(data=token_data, token_version=user.token_version)
    refresh_token = create_refresh_token(data=token_data)
    
    return {
        "message": "OTP verified successfully",
        "user_uid": user_uid,
        "is_new_user": is_new_user,
        "is_verified": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

# =========================================================
# OTP ENDPOINTS (Production Ready)
# =========================================================


# =====================================================
# USER DASHBOARD ENDPOINTS (Merged)
# =====================================================

@router.get("/dashboard", tags=["User"])
def get_user_dashboard(
    detailed: bool = Query(False, description="Get detailed dashboard with full post list"),
    page: int = Query(1, ge=1, description="Page number (if detailed=True)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page (if detailed=True)"),
    recent_limit: int = Query(5, ge=1, le=20, description="Number of recent posts to show"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user dashboard overview.
    Use detailed=True for paginated post list.
    """
    user_uid = current_user.user_uid
    
    user = db.query(User).filter(User.user_uid == user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get counts
    total_posts = db.query(News).filter(News.user_uid == user_uid).count()
    approved = db.query(News).filter(News.user_uid == user_uid, News.is_approved == 1).count()
    pending = db.query(News).filter(
        News.user_uid == user_uid,
        News.is_approved == 0,
        News.rejected_at == None
    ).count()
    rejected = db.query(News).filter(News.user_uid == user_uid, News.rejected_at != None).count()
    
    # Engagement totals
    total_views = db.query(func.sum(News.views_count)).filter(News.user_uid == user_uid).scalar() or 0
    total_likes = db.query(func.sum(News.likes_count)).filter(News.user_uid == user_uid).scalar() or 0
    total_comments = db.query(func.sum(News.comments_count)).filter(News.user_uid == user_uid).scalar() or 0
    total_shares = db.query(func.sum(News.shares_count)).filter(News.user_uid == user_uid).scalar() or 0
    
    # Recent activity
    week_ago = _get_utc_now() - timedelta(days=7)
    recent_activity = db.query(News).filter(
        News.user_uid == user_uid,
        News.created_at >= week_ago
    ).count()
    
    # Recent posts
    recent_posts = db.query(News).filter(
        News.user_uid == user_uid
    ).order_by(desc(News.created_at)).limit(recent_limit).all()
    
    base_response = {
        "user": {
            "user_uid": user.user_uid,
            "user_name": user.user_name,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "role_name": schemas.user_role_label(user.role),
            "is_publisher": user.role == UserRole.PUBLISHER,
            "is_verified": user.email_verified and user.mobile_verified,
            "member_since": user.created_at,
            "profile_completion": _calculate_profile_completion(user)
        },
        "statistics": {
            "posts": {
                "total": total_posts,
                "approved": approved,
                "pending": pending,
                "rejected": rejected,
                "approval_rate": round(approved / total_posts * 100, 2) if total_posts > 0 else 0
            },
            "engagement": {
                "total_views": total_views,
                "total_likes": total_likes,
                "total_comments": total_comments,
                "total_shares": total_shares,
                "avg_views_per_post": round(total_views / total_posts, 2) if total_posts > 0 else 0,
                "engagement_rate": round((total_likes + total_comments + total_shares) / total_views * 100, 2) if total_views > 0 else 0
            }
        },
        "recent_activity": {
            "posts_last_7_days": recent_activity,
            "has_activity": recent_activity > 0
        },
        "quick_actions": _get_quick_actions(user)
    }
    
    if detailed:
        # Get paginated posts
        query = db.query(News).filter(News.user_uid == user_uid)
        offset = (page - 1) * limit
        total = query.count()
        posts = query.order_by(desc(News.created_at)).offset(offset).limit(limit).all()
        total_pages = (total + limit - 1) // limit
        
        base_response["recent_posts"] = {
            "items": [
                {
                    "news_uid": p.news_uid,
                    "title": p.title,
                    "summary": p.summary[:150] if p.summary else None,
                    "created_at": p.created_at,
                    "status": _get_post_status(p),
                    "views": p.views_count,
                    "likes": p.likes_count
                }
                for p in posts
            ],
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
    else:
        base_response["recent_posts"] = {
            "items": [
                {
                    "news_uid": p.news_uid,
                    "title": p.title,
                    "summary": p.summary[:150] if p.summary else None,
                    "created_at": p.created_at,
                    "status": _get_post_status(p),
                    "views": p.views_count,
                    "likes": p.likes_count
                }
                for p in recent_posts
            ],
            "has_more": total_posts > recent_limit,
            "view_all_url": "/dashboard?detailed=true&page=1&limit=20"
        }
    
    return base_response

# routes/user_routes.py - UPDATED DASHBOARD

# routes/user_routes.py - COMPLETE FIXED VERSION


def _get_utc_now() -> datetime:
    """Get timezone-aware UTC datetime"""
    return datetime.now(timezone.utc)


def _get_time_ago(dt: datetime) -> str:
    """Get human-readable time ago string"""
    now = _get_utc_now()
    diff = now - dt
    
    if diff.days > 0:
        return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
    elif diff.seconds >= 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    elif diff.seconds >= 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
    else:
        return "Just now"


def _get_level_name(level: int) -> str:
    """Get level name based on level number"""
    level_names = {
        1: "Contributor",
        2: "Writer",
        3: "Influencer",
        4: "Star",
        5: "Elite",
        6: "Legend",
        7: "Mythic"
    }
    return level_names.get(level, "Contributor")


def _get_post_status(news) -> str:
    """Get human-readable post status"""
    if news.is_approved == 1:
        return "approved"
    elif news.rejected_at:
        return "rejected"
    else:
        return "pending"


def _get_quick_actions(user: User) -> list:
    """Get quick actions based on user role"""
    actions = [
        {"label": "Create Post", "url": "/posts/create", "icon": "create", "type": "primary"}
    ]
    
    if user.role == UserRole.PUBLISHER:
        actions.append({"label": "Write News", "url": "/news/create", "icon": "newspaper", "type": "primary"})
        actions.append({"label": "View Analytics", "url": "/analytics", "icon": "chart", "type": "secondary"})
    
    if not user.email_verified:
        actions.append({"label": "Verify Email", "url": "/verify-email", "icon": "mail", "type": "warning"})
    
    if not user.mobile_verified:
        actions.append({"label": "Verify Phone", "url": "/verify-mobile", "icon": "phone", "type": "warning"})
    
    return actions


def _calculate_profile_completion(user: User) -> int:
    """Calculate profile completion percentage"""
    fields = [
        user.user_name,
        user.name,
        user.email,
        user.phone,
        user.gender,
        user.date_of_birth,
        user.language,
        user.state_id,
        user.district_id,
        user.city_id
    ]
    completed = sum(1 for f in fields if f)
    return int((completed / len(fields)) * 100)


# routes/user_routes.py - UPDATED DASHBOARD API

# routes/user_routes.py - UPDATED DASHBOARD API

from schemas import USER_ROLE_LABELS  # Add this import at top

@router.get("/dashboardnew", tags=["User"])
def get_user_dashboard(
    detailed: bool = Query(False, description="Get detailed dashboard with full post list"),
    page: str = Query("1", description="Page number (if detailed=True)"),
    limit: str = Query("20", description="Items per page (if detailed=True)"),
    recent_limit: str = Query("5", description="Number of recent posts to show"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user dashboard overview.
    Returns role-specific data for all roles:
    - User: Profile, stats, posts, publisher CTA
    - Publisher: Profile, stats, posts, news stats, news list
    - Moderator: Profile, stats, posts, moderation tools
    - Employee: Profile, stats, posts, employee tools
    - Admin: Profile, stats, posts, admin tools
    """
    # ✅ Clean and convert parameters (fixes the newline issue)
    try:
        page = int(page.strip())
        limit = int(limit.strip())
        recent_limit = int(recent_limit.strip())
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid parameter value")
    
    user_uid = current_user.user_uid
    
    user = db.query(User).filter(User.user_uid == user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # =========================================================
    # ROLE DETECTION
    # =========================================================
    is_publisher = user.role == UserRole.PUBLISHER
    is_user = user.role == UserRole.USER
    is_moderator = user.role == UserRole.MODERATOR
    is_employee = user.role == UserRole.EMPLOYEE
    is_admin = user.role == UserRole.ADMIN
    
    can_publish_news = user.role in [UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]
    
    # =========================================================
    # 1️⃣ GET USER LOCATION
    # =========================================================
    location = ""
    if user.city and user.city.name:
        location = user.city.name
    if user.district and user.district.name:
        location = f"{user.district.name}, {location}" if location else user.district.name
    if user.state and user.state.name:
        location = f"{location}, {user.state.name}" if location else user.state.name
    
    # =========================================================
    # 2️⃣ GET REWARDS DATA
    # =========================================================
    from models.rewards import UserRewards, UserTransaction
    
    rewards = db.query(UserRewards).filter(UserRewards.user_uid == user_uid).first()
    
    # Get today's earnings
    today = date.today()
    today_points = db.query(func.sum(UserTransaction.amount)).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.transaction_type == "earn",
        UserTransaction.currency_type == "points",
        func.date(UserTransaction.created_at) == today
    ).scalar() or 0
    
    today_coins = db.query(func.sum(UserTransaction.amount)).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.transaction_type == "earn",
        UserTransaction.currency_type == "coins",
        func.date(UserTransaction.created_at) == today
    ).scalar() or 0
    
    # Get weekly earnings
    week_ago = _get_utc_now() - timedelta(days=7)
    weekly_points = db.query(func.sum(UserTransaction.amount)).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.transaction_type == "earn",
        UserTransaction.currency_type == "points",
        UserTransaction.created_at >= week_ago
    ).scalar() or 0
    
    weekly_coins = db.query(func.sum(UserTransaction.amount)).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.transaction_type == "earn",
        UserTransaction.currency_type == "coins",
        UserTransaction.created_at >= week_ago
    ).scalar() or 0
    
    # Get monthly earnings
    month_ago = _get_utc_now() - timedelta(days=30)
    monthly_points = db.query(func.sum(UserTransaction.amount)).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.transaction_type == "earn",
        UserTransaction.currency_type == "points",
        UserTransaction.created_at >= month_ago
    ).scalar() or 0
    
    monthly_coins = db.query(func.sum(UserTransaction.amount)).filter(
        UserTransaction.user_uid == user_uid,
        UserTransaction.transaction_type == "earn",
        UserTransaction.currency_type == "coins",
        UserTransaction.created_at >= month_ago
    ).scalar() or 0
    
    # =========================================================
    # 3️⃣ GET FOLLOW COUNTS
    # =========================================================
    from models.follow import Follow
    
    followers_count = db.query(Follow).filter(
        Follow.following_uid == user_uid,
        Follow.is_active == True
    ).count()
    
    following_count = db.query(Follow).filter(
        Follow.follower_uid == user_uid,
        Follow.is_active == True
    ).count()
    
    # =========================================================
    # 4️⃣ GET USER RANK
    # =========================================================
    if rewards:
        rank = db.query(func.count(UserRewards.user_uid)).filter(
            UserRewards.points > rewards.points
        ).scalar() or 0
        user_rank = rank + 1
        total_users = db.query(UserRewards).count()
        top_percent = round((user_rank / total_users) * 100, 1) if total_users > 0 else 0
    else:
        user_rank = None
        top_percent = None
    
    # =========================================================
    # 5️⃣ GET NOTIFICATION COUNT
    # =========================================================
    from models.engagement import Notification
    
    unread_notification_count = db.query(func.count(Notification.id)).filter(
        Notification.user_uid == user_uid,
        Notification.is_read == False
    ).scalar() or 0
    
    # =========================================================
    # 6️⃣ GET NEWS STATS (Only for users who can publish)
    # =========================================================
    news_stats = None
    recent_news = None
    
    if can_publish_news:
        total_news_posts = db.query(News).filter(News.user_uid == user_uid).count()
        approved_news = db.query(News).filter(News.user_uid == user_uid, News.is_approved == 1).count()
        pending_news = db.query(News).filter(
            News.user_uid == user_uid,
            News.is_approved == 0,
            News.rejected_at == None
        ).count()
        rejected_news = db.query(News).filter(News.user_uid == user_uid, News.rejected_at != None).count()
        
        news_views = db.query(func.sum(News.views_count)).filter(News.user_uid == user_uid).scalar() or 0
        news_likes = db.query(func.sum(News.likes_count)).filter(News.user_uid == user_uid).scalar() or 0
        news_comments = db.query(func.sum(News.comments_count)).filter(News.user_uid == user_uid).scalar() or 0
        news_shares = db.query(func.sum(News.shares_count)).filter(News.user_uid == user_uid).scalar() or 0
        
        news_stats = {
            "total": total_news_posts,
            "approved": approved_news,
            "pending": pending_news,
            "rejected": rejected_news,
            "approval_rate": round(approved_news / total_news_posts * 100, 2) if total_news_posts > 0 else 0,
            "engagement": {
                "views": news_views,
                "likes": news_likes,
                "comments": news_comments,
                "shares": news_shares
            }
        }
        
        # Get recent news
        recent_news_items = db.query(News).filter(
            News.user_uid == user_uid
        ).order_by(desc(News.created_at)).limit(recent_limit).all()
        
        recent_news = []
        for news in recent_news_items:
            recent_news.append({
                "news_uid": news.news_uid,
                "title": news.title,
                "summary": news.summary[:150] if news.summary else None,
                "image_url": news.image_url,
                "created_at": news.created_at,
                "time_ago": _get_time_ago(news.created_at),
                "status": "approved" if news.is_approved == 1 else "pending" if not news.rejected_at else "rejected",
                "views": news.views_count,
                "likes": news.likes_count,
                "comments": news.comments_count,
                "shares": news.shares_count,
                "rejection_reason": news.rejection_reason if news.rejected_at else None
            })
    
    # =========================================================
    # 7️⃣ GET USER POSTS STATS
    # =========================================================
    from models.post import Post
    
    total_user_posts = db.query(Post).filter(Post.user_uid == user_uid).count()
    user_posts_likes = db.query(func.sum(Post.like_count)).filter(Post.user_uid == user_uid).scalar() or 0
    user_posts_comments = db.query(func.sum(Post.comment_count)).filter(Post.user_uid == user_uid).scalar() or 0
    user_posts_shares = db.query(func.sum(Post.share_count)).filter(Post.user_uid == user_uid).scalar() or 0
    
    # Get recent user posts
    recent_user_posts_items = db.query(Post).filter(
        Post.user_uid == user_uid
    ).order_by(desc(Post.created_at)).limit(recent_limit).all()
    
    recent_user_posts = []
    for post in recent_user_posts_items:
        recent_user_posts.append({
            "post_uid": post.post_uid,
            "content": post.content[:150] if post.content else None,
            "image_url": post.image_url,
            "created_at": post.created_at,
            "time_ago": _get_time_ago(post.created_at),
            "likes": post.like_count,
            "comments": post.comment_count,
            "shares": post.share_count,
            "status": "approved"
        })
    
    # =========================================================
    # 8️⃣ BUILD BASE RESPONSE
    # =========================================================
    response = {
        "user": {
            "user_uid": user.user_uid,
            "user_name": user.user_name,
            "name": user.name,
            "profile_picture": get_avatar_for_user(user.name, user.user_uid),
            "location": location,
            "joined_date": user.created_at.strftime("%b %Y"),
            "followers_count": followers_count,
            "following_count": following_count,
            "role": user.role,
            "role_name": USER_ROLE_LABELS.get(user.role, "User"),
            "is_publisher": is_publisher,
            "is_verified": user.email_verified and user.mobile_verified,
            "rank": user_rank,
            "top_percent": top_percent,
            "unread_notifications": unread_notification_count,
            "profile_completion": _calculate_profile_completion(user)
        },
        "stats": {
            "total_posts": total_user_posts,
            "total_likes": user_posts_likes,
            "total_comments": user_posts_comments,
            "level": rewards.level if rewards else 1,
            "level_name": _get_level_name(rewards.level if rewards else 1),
            "coins": rewards.coins if rewards else 0,
            "points": rewards.points if rewards else 0,
            "current_streak": rewards.current_streak if rewards else 0,
            "longest_streak": rewards.longest_streak if rewards else 0,
            "today_earnings": {
                "points": today_points,
                "coins": today_coins
            },
            "weekly_earnings": {
                "points": weekly_points,
                "coins": weekly_coins
            },
            "monthly_earnings": {
                "points": monthly_points,
                "coins": monthly_coins
            }
        },
        "recent_posts": {
            "items": recent_user_posts,
            "total": total_user_posts,
            "has_more": total_user_posts > recent_limit
        },
        "quick_actions": _get_quick_actions(user)
    }
    
    # =========================================================
    # 9️⃣ ADD NEWS DATA (For users who can publish)
    # =========================================================
    if can_publish_news:
        response["news_stats"] = news_stats
        response["recent_news"] = {
            "items": recent_news,
            "total": news_stats["total"] if news_stats else 0,
            "has_more": (news_stats["total"] if news_stats else 0) > recent_limit
        }
        response["publisher_actions"] = {
            "write_news": "/news/create",
            "view_all_news": "/dashboard?tab=news&detailed=true"
        }
    
    # =========================================================
    # 🔟 ADD PUBLISHER VERIFICATION CTA (Only for regular users)
    # =========================================================
    if is_user:
        can_become_publisher = all([
            user.email_verified,
            user.mobile_verified,
            bool(user.name),
            bool(user.date_of_birth),
            bool(user.gender)
        ])
        
        missing_requirements = []
        if not user.email_verified:
            missing_requirements.append("email_verified")
        if not user.mobile_verified:
            missing_requirements.append("mobile_verified")
        if not user.name:
            missing_requirements.append("name")
        if not user.date_of_birth:
            missing_requirements.append("date_of_birth")
        if not user.gender:
            missing_requirements.append("gender")
        
        response["publisher_cta"] = {
            "show_cta": True,
            "can_apply": can_become_publisher,
            "message": "Get verified as a Publisher to write and publish news for your city." if not can_become_publisher else "You are eligible to become a publisher!",
            "missing_requirements": missing_requirements,
            "apply_endpoint": "/auth/switch-to-publisher" if can_become_publisher else "/users/me/publisher-eligibility"
        }
    
    # =========================================================
    # 1️⃣1️⃣ ADD MODERATOR TOOLS (Only for Moderators)
    # =========================================================
    if is_moderator:
        pending_news_count = db.query(News).filter(
            News.is_approved == 0,
            News.rejected_at == None
        ).count()
        
        response["moderator_tools"] = {
            "pending_news_count": pending_news_count,
            "reported_comments": 0,
            "moderate_url": "/moderation/dashboard"
        }
    
    # =========================================================
    # 1️⃣2️⃣ ADD EMPLOYEE TOOLS (Only for Employees)
    # =========================================================
    if is_employee:
        response["employee_tools"] = {
            "auto_generated_news": db.query(News).filter(News.is_auto_generated == True).count(),
            "draft_articles": db.query(News).filter(
                News.is_approved == 0,
                News.rejected_at == None,
                News.user_uid == user_uid
            ).count(),
            "employee_dashboard_url": "/employee/dashboard"
        }
    
    # =========================================================
    # 1️⃣3️⃣ ADD ADMIN TOOLS (Only for Admins)
    # =========================================================
    if is_admin:
        response["admin_tools"] = {
            "total_users": db.query(User).count(),
            "total_news": db.query(News).count(),
            "total_posts": db.query(Post).count(),
            "pending_approvals": db.query(News).filter(
                News.is_approved == 0,
                News.rejected_at == None
            ).count(),
            "admin_dashboard_url": "/admin/dashboard"
        }
    
    # =========================================================
    # 1️⃣4️⃣ ADD DETAILED POSTS (if requested)
    # =========================================================
    if detailed:
        # Get paginated user posts
        posts_query = db.query(Post).filter(Post.user_uid == user_uid)
        offset = (page - 1) * limit
        posts_total = posts_query.count()
        user_posts_list = posts_query.order_by(desc(Post.created_at)).offset(offset).limit(limit).all()
        posts_total_pages = (posts_total + limit - 1) // limit
        
        response["detailed_posts"] = {
            "items": [
                {
                    "post_uid": p.post_uid,
                    "content": p.content[:200] if p.content else None,
                    "image_url": p.image_url,
                    "created_at": p.created_at,
                    "time_ago": _get_time_ago(p.created_at),
                    "likes": p.like_count,
                    "comments": p.comment_count,
                    "shares": p.share_count,
                    "hashtags": [h.name for h in p.hashtags] if p.hashtags else [],
                    "status": "approved"
                }
                for p in user_posts_list
            ],
            "pagination": {
                "total": posts_total,
                "page": page,
                "limit": limit,
                "total_pages": posts_total_pages,
                "has_next": page < posts_total_pages,
                "has_previous": page > 1
            }
        }
        
        # Add detailed news for publishers
        if can_publish_news:
            news_query = db.query(News).filter(News.user_uid == user_uid)
            news_total = news_query.count()
            news_posts = news_query.order_by(desc(News.created_at)).offset(offset).limit(limit).all()
            news_total_pages = (news_total + limit - 1) // limit
            
            response["detailed_news"] = {
                "items": [
                    {
                        "news_uid": n.news_uid,
                        "title": n.title,
                        "summary": n.summary[:150] if n.summary else None,
                        "image_url": n.image_url,
                        "created_at": n.created_at,
                        "time_ago": _get_time_ago(n.created_at),
                        "status": "approved" if n.is_approved == 1 else "pending" if not n.rejected_at else "rejected",
                        "rejection_reason": n.rejection_reason if n.rejected_at else None,
                        "views": n.views_count,
                        "likes": n.likes_count,
                        "comments": n.comments_count,
                        "shares": n.shares_count
                    }
                    for n in news_posts
                ],
                "pagination": {
                    "total": news_total,
                    "page": page,
                    "limit": limit,
                    "total_pages": news_total_pages,
                    "has_next": page < news_total_pages,
                    "has_previous": page > 1
                }
            }
    
    return response
@router.get("/dashboard/engagement", tags=["User"])
def get_dashboard_engagement(
    period: str = Query("week", enum=["day", "week", "month", "year", "all"]),
    metric: str = Query("all", enum=["all", "views", "likes", "comments", "shares"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user engagement analytics"""
    user_uid = current_user.user_uid
    now = _get_utc_now()
    
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = datetime(2000, 1, 1, tzinfo=timezone.utc)
    
    # Simplified time series for better performance
    time_series = db.query(
        func.date_trunc('day', News.created_at).label('period'),
        func.count(News.id).label('posts'),
        func.sum(News.views_count).label('views'),
        func.sum(News.likes_count).label('likes'),
        func.sum(News.comments_count).label('comments'),
        func.sum(News.shares_count).label('shares')
    ).filter(
        News.user_uid == user_uid,
        News.created_at >= start_date
    ).group_by('period').order_by('period').all()
    
    time_series = [
        {
            "period": t.period.isoformat() if hasattr(t.period, 'isoformat') else str(t.period),
            "views": t.views or 0,
            "likes": t.likes or 0,
            "comments": t.comments or 0,
            "shares": t.shares or 0,
            "posts": t.posts
        }
        for t in time_series
    ]
    
    totals = db.query(
        func.sum(News.views_count).label('total_views'),
        func.sum(News.likes_count).label('total_likes'),
        func.sum(News.comments_count).label('total_comments'),
        func.sum(News.shares_count).label('total_shares')
    ).filter(News.user_uid == user_uid).first()
    
    total_views = totals.total_views or 0
    total_likes = totals.total_likes or 0
    total_comments = totals.total_comments or 0
    total_shares = totals.total_shares or 0
    
    top_posts = db.query(News).filter(
        News.user_uid == user_uid,
        News.is_approved == 1
    ).order_by(desc(News.views_count)).limit(5).all()
    
    growth = {}
    if len(time_series) >= 2:
        current = time_series[-1]
        previous = time_series[-2]
        
        growth = {
            "views": {
                "current": current["views"],
                "previous": previous["views"],
                "percentage": round((current["views"] - previous["views"]) / previous["views"] * 100, 2) if previous["views"] > 0 else 0,
                "trend": "up" if current["views"] > previous["views"] else "down"
            }
        }
    
    if metric != "all":
        for item in time_series:
            for key in list(item.keys()):
                if key not in ["period", metric]:
                    item[key] = None
    
    return {
        "period": period,
        "time_range": {
            "start": start_date.isoformat(),
            "end": now.isoformat()
        },
        "summary": {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "total_engagement": total_likes + total_comments + total_shares,
            "engagement_rate": round((total_likes + total_comments + total_shares) / total_views * 100, 2) if total_views > 0 else 0
        },
        "time_series": time_series,
        "growth": growth,
        "top_posts": [
            {
                "news_uid": p.news_uid,
                "title": p.title,
                "views": p.views_count,
                "likes": p.likes_count,
                "comments": p.comments_count,
                "shares": p.shares_count,
                "engagement_rate": round(
                    (p.likes_count + p.comments_count + p.shares_count) / p.views_count * 100, 2
                ) if p.views_count > 0 else 0
            }
            for p in top_posts
        ]
    }


# =====================================================
# USER PROFILE ENDPOINTS (Merged)
# =====================================================

# routes/user_routes.py - UPDATED GET API

@router.get("/users/me", response_model=schemas.UserProfileOut, tags=["User"])
def get_my_profile(
    include_preferences: bool = Query(False, description="Include user preferences"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's profile.
    
    Returns:
    - User information
    - Email and phone verification status (from Firebase)
    - Location information
    - Optional preferences (categories, language, location)
    """
    user = db.query(User).filter(User.user_uid == current_user.user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get location names
    state_name = None
    district_name = None
    city_name = None
    
    if user.state_id:
        state = db.query(State).filter(State.id == user.state_id).first()
        state_name = state.name if state else None
    if user.district_id:
        district = db.query(District).filter(District.id == user.district_id).first()
        district_name = district.name if district else None
    if user.city_id:
        city = db.query(City).filter(City.id == user.city_id).first()
        city_name = city.name if city else None
        
    # Generate default profile picture if missing
    profile_picture = user.profile_picture
    if not profile_picture:
        from services.avatar_service import get_avatar_for_user
        profile_picture = get_avatar_for_user(name=user.name, user_uid=user.user_uid, gender=user.gender)
    
    response = {
        "user_uid": user.user_uid,
        "user_name": user.user_name,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "gender": user.gender,
        "date_of_birth": user.date_of_birth,
        "language": user.language,
        "profile_picture": profile_picture,
        "location": {
            "state_id": user.state_id,
            "state_name": state_name,
            "district_id": user.district_id,
            "district_name": district_name,
            "city_id": user.city_id,
            "city_name": city_name
        },
        "role": user.role,
        "role_name": _get_role_name(user.role),
        "email_verified": user.email_verified,
        "mobile_verified": user.mobile_verified,
        "is_suspended": user.is_suspended,
        "created_at": user.created_at,
        "updated_at": user.updated_at if hasattr(user, 'updated_at') else user.created_at,
        "last_login": user.last_login
    }
    
    if include_preferences:
        preferences = db.query(UserPreference).filter(
            UserPreference.user_uid == user.user_uid
        ).first()
        
        if preferences:
            language = db.query(Language).filter(Language.id == preferences.language_id).first()
            response["preferences"] = {
                "language_id": preferences.language_id,
                "language_code": language.code if language else None,
                "state_id": preferences.state_id,
                "district_id": preferences.district_id,
                "city_id": preferences.city_id,
                "category_ids": [cat.id for cat in preferences.categories] if preferences.categories else []
            }
        else:
            response["preferences"] = None
    
    return response

# routes/user_routes.py - UPDATED UPDATE API

# routes/user_routes.py - CORRECTED PATCH API

# routes/user_routes.py - COMPLETE FIXED VERSION

@router.patch("/users/me", response_model=schemas.UserProfileOut, tags=["User"])
def update_my_profile(
    update_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update current user's profile.
    
    ✅ You CAN update:
    - user_name (username)
    - name (full name)
    - gender
    - date_of_birth
    - language_id (language preference)
    - state_id, district_id, city_id (location)
    - profile_picture
    
    ❌ You CANNOT update (Use Firebase instead):
    - email (change via Firebase Auth)
    - phone (change via Firebase Auth)
    
    Email and Phone verification status comes from Firebase automatically
    during login/token refresh.
    """
    user = db.query(User).filter(User.user_uid == current_user.user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_fields = []
    
    # =========================================================
    # UPDATE USERNAME
    # =========================================================
    if update_data.user_name is not None:
        if len(update_data.user_name) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        if len(update_data.user_name) > 18:
            raise HTTPException(status_code=400, detail="Username must be less than 18 characters")
        existing = db.query(User).filter(
            User.user_name == update_data.user_name,
            User.user_uid != user.user_uid
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        user.user_name = update_data.user_name
        updated_fields.append("user_name")
    
    # =========================================================
    # UPDATE FULL NAME
    # =========================================================
    if update_data.name is not None:
        if len(update_data.name) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        if len(update_data.name) > 100:
            raise HTTPException(status_code=400, detail="Name must be less than 100 characters")
        user.name = update_data.name
        updated_fields.append("name")
    
    # =========================================================
    # UPDATE GENDER
    # =========================================================
    if update_data.gender is not None:
        valid_genders = ["male", "female", "other", "prefer_not_to_say"]
        if update_data.gender not in valid_genders:
            raise HTTPException(status_code=400, detail=f"Gender must be one of: {', '.join(valid_genders)}")
        user.gender = update_data.gender
        updated_fields.append("gender")
    
    # =========================================================
    # UPDATE DATE OF BIRTH
    # =========================================================
    if update_data.date_of_birth is not None:
        today = _get_utc_now().date()
        age = today.year - update_data.date_of_birth.year
        if today.month < update_data.date_of_birth.month or \
           (today.month == update_data.date_of_birth.month and today.day < update_data.date_of_birth.day):
            age -= 1
        
        if age < 13:
            raise HTTPException(status_code=400, detail="You must be at least 13 years old")
        if age > 120:
            raise HTTPException(status_code=400, detail="Invalid date of birth")
        
        user.date_of_birth = update_data.date_of_birth
        updated_fields.append("date_of_birth")
    
    # =========================================================
    # UPDATE LANGUAGE ID (FIXED)
    # =========================================================
    if update_data.language_id is not None:
        # Verify language exists
        language = db.query(Language).filter(Language.id == update_data.language_id).first()
        if not language:
            raise HTTPException(status_code=400, detail="Invalid language ID")
        user.language_id = update_data.language_id
        updated_fields.append("language_id")
    
    # =========================================================
    # UPDATE LOCATION (State, District, City)
    # =========================================================
    if update_data.state_id is not None:
        if update_data.state_id:
            state = db.query(State).filter(State.id == update_data.state_id).first()
            if not state:
                raise HTTPException(status_code=400, detail="Invalid state ID")
        user.state_id = update_data.state_id
        updated_fields.append("state_id")
    
    if update_data.district_id is not None:
        if update_data.district_id:
            # Verify district belongs to selected state
            district = db.query(District).filter(District.id == update_data.district_id).first()
            if not district:
                raise HTTPException(status_code=400, detail="Invalid district ID")
            # Check if district belongs to user's state
            if user.state_id and district.state_id != user.state_id:
                raise HTTPException(status_code=400, detail="District does not belong to selected state")
        user.district_id = update_data.district_id
        updated_fields.append("district_id")
    
    if update_data.city_id is not None:
        if update_data.city_id:
            # Verify city belongs to selected district
            city = db.query(City).filter(City.id == update_data.city_id).first()
            if not city:
                raise HTTPException(status_code=400, detail="Invalid city ID")
            # Check if city belongs to user's district
            if user.district_id and city.district_id != user.district_id:
                raise HTTPException(status_code=400, detail="City does not belong to selected district")
        user.city_id = update_data.city_id
        updated_fields.append("city_id")
    
    # =========================================================
    # UPDATE PROFILE PICTURE
    # =========================================================
    if update_data.profile_picture is not None:
        user.profile_picture = update_data.profile_picture
        updated_fields.append("profile_picture")
    
    # =========================================================
    # VALIDATE NO FIELDS TO UPDATE
    # =========================================================
    if not updated_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # =========================================================
    # SAVE CHANGES
    # =========================================================
    user.updated_at = _get_utc_now()
    db.commit()
    db.refresh(user)
    
    # =========================================================
    # RETURN UPDATED PROFILE
    # =========================================================
    return get_my_profile(db=db, current_user=user)
# =====================================================
# PREFERENCES ENDPOINTS
# =====================================================

# routes/user_routes.py - UPDATED PREFERENCES APIS

# =====================================================
# PREFERENCES APIS
# =====================================================

# routes/user_routes.py - UPDATE get_my_preference

@router.get("/preferences/me", response_model=schemas.UserPreferenceResponse, tags=["Preferences"])
def get_my_preference(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's preferences.
    
    Returns names instead of IDs for better readability.
    """
    user_uid = current_user.user_uid

    user_pref = db.query(UserPreference).filter(
        UserPreference.user_uid == user_uid
    ).first()
    
    if not user_pref:
        raise HTTPException(
            status_code=404, 
            detail="Preferences not found. Please create preferences first using POST /preferences/me"
        )

    # Get language details
    language = db.query(Language).filter(Language.id == user_pref.language_id).first()
    lang_code = language.code if language else None
    lang_name = language.name if language else None
    
    # Get location details
    state = None
    district = None
    city = None
    
    if user_pref.state_id:
        state = db.query(State).filter(State.id == user_pref.state_id).first()
    if user_pref.district_id:
        district = db.query(District).filter(District.id == user_pref.district_id).first()
    if user_pref.city_id:
        city = db.query(City).filter(City.id == user_pref.city_id).first()
    
    # Get category details with names
    categories_with_names = []
    category_ids = []
    
    for cat in user_pref.categories:
        categories_with_names.append({
            "id": cat.id,
            "name": cat.name,
            "slug": getattr(cat, 'slug', None)
        })
        category_ids.append(cat.id)
    
    return schemas.UserPreferenceResponse(
        user_uid=user_pref.user_uid,
        language=lang_code,
        language_name=lang_name,  # ✅ Now returns name
        state_id=user_pref.state_id,
        state_name=state.name if state else None,  # ✅ Now returns name
        district_id=user_pref.district_id,
        district_name=district.name if district else None,  # ✅ Now returns name
        city_id=user_pref.city_id,
        city_name=city.name if city else None,  # ✅ Now returns name
        categories=categories_with_names,  # ✅ Now returns [{id: 1, name: "Politics"}]
        category_ids=category_ids,  # Keep for backward compatibility
        created_at=user_pref.created_at,
        updated_at=user_pref.updated_at,
    )


# routes/user_routes.py - UPDATE create_my_preference

@router.post("/preferences/me", response_model=schemas.UserPreferenceResponse, status_code=status.HTTP_201_CREATED, tags=["Preferences"])
def create_my_preference(
    pref: schemas.UserPreferenceCreateMe,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create preferences for current user.
    
    Validation:
    - District must belong to selected State
    - City must belong to selected District
    """
    user_uid = current_user.user_uid
    
    existing = db.query(UserPreference).filter(
        UserPreference.user_uid == user_uid
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Preferences already exist. Use PUT /preferences/me to update"
        )
    
    # ✅ Validate location relations
    validate_location_relation(pref.state_id, pref.district_id, pref.city_id, db)
    
    return _create_or_update_preference(user_uid, pref, db, is_create=True)

# routes/user_routes.py - UPDATE update_my_preference

@router.put("/preferences/me", response_model=schemas.UserPreferenceResponse, tags=["Preferences"])
def update_my_preference(
    pref: schemas.UserPreferenceUpdateMe,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update all preferences for current user (full replace).
    
    Validation:
    - District must belong to selected State
    - City must belong to selected District
    """
    user_uid = current_user.user_uid
    
    existing = db.query(UserPreference).filter(
        UserPreference.user_uid == user_uid
    ).first()
    
    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Preferences not found. Please create preferences first using POST /preferences/me"
        )
    
    # ✅ Validate location relations
    validate_location_relation(pref.state_id, pref.district_id, pref.city_id, db)
    
    return _create_or_update_preference(user_uid, pref, db, is_create=False)

# routes/user_routes.py - UPDATE patch_my_preference

# routes/user_routes.py - UPDATE patch_my_preference

@router.patch("/preferences/me", response_model=schemas.UserPreferenceResponse, tags=["Preferences"])
def patch_my_preference(
    pref: schemas.UserPreferencePatchMe,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Partially update current user's preferences.
    
    Validation:
    - District must belong to selected State
    - City must belong to selected District
    """
    user_uid = current_user.user_uid
    
    user_pref = db.query(UserPreference).filter(
        UserPreference.user_uid == user_uid
    ).first()
    
    if not user_pref:
        raise HTTPException(
            status_code=404,
            detail="Preferences not found. Please create preferences first using POST /preferences/me"
        )
    
    updated_fields = []
    
    # Get current values (for validation when updating individually)
    final_state_id = pref.state_id if pref.state_id is not None else user_pref.state_id
    final_district_id = pref.district_id if pref.district_id is not None else user_pref.district_id
    final_city_id = pref.city_id if pref.city_id is not None else user_pref.city_id
    
    # ✅ Validate location relations with final values
    validate_location_relation(final_state_id, final_district_id, final_city_id, db)
    
    # Update language
    if pref.language_id is not None:
        language = db.query(Language).filter(Language.id == pref.language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")
        
        # Validate language location requirements
        lang_code = language.code.lower()
        if lang_code == "te":  # Telugu requires location
            if not (final_state_id and final_district_id and final_city_id):
                raise HTTPException(
                    status_code=400,
                    detail="Telugu language requires state, district, and city preferences"
                )
        
        user_pref.language_id = pref.language_id
        updated_fields.append("language_id")
    
    # Update location (with validated values)
    if pref.state_id is not None:
        user_pref.state_id = pref.state_id
        updated_fields.append("state_id")
    
    if pref.district_id is not None:
        user_pref.district_id = pref.district_id
        updated_fields.append("district_id")
    
    if pref.city_id is not None:
        user_pref.city_id = pref.city_id
        updated_fields.append("city_id")
    
    # Update categories
    if pref.category_ids is not None:
        if pref.category_ids:
            categories = db.query(Category).filter(Category.id.in_(pref.category_ids)).all()
            if len(categories) != len(pref.category_ids):
                found_ids = [c.id for c in categories]
                missing_ids = set(pref.category_ids) - set(found_ids)
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid category IDs: {missing_ids}"
                )
            user_pref.categories = categories
        else:
            user_pref.categories = []
        updated_fields.append("category_ids")
    
    if not updated_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    user_pref.updated_at = _get_utc_now()
    db.commit()
    db.refresh(user_pref)
    
    # Get details for response (with NAMES)
    language = db.query(Language).filter(Language.id == user_pref.language_id).first()
    lang_code = language.code if language else None
    lang_name = language.name if language else None
    
    state = None
    district = None
    city = None
    
    if user_pref.state_id:
        state = db.query(State).filter(State.id == user_pref.state_id).first()
    if user_pref.district_id:
        district = db.query(District).filter(District.id == user_pref.district_id).first()
    if user_pref.city_id:
        city = db.query(City).filter(City.id == user_pref.city_id).first()
    
    categories_with_names = []
    category_ids = []
    
    for cat in user_pref.categories:
        categories_with_names.append({
            "id": cat.id,
            "name": cat.name,
            "slug": getattr(cat, 'slug', None)
        })
        category_ids.append(cat.id)
    
    return schemas.UserPreferenceResponse(
        user_uid=user_pref.user_uid,
        language=lang_code,
        language_name=lang_name,
        state_id=user_pref.state_id,
        state_name=state.name if state else None,
        district_id=user_pref.district_id,
        district_name=district.name if district else None,
        city_id=user_pref.city_id,
        city_name=city.name if city else None,
        categories=categories_with_names,
        category_ids=category_ids,
        created_at=user_pref.created_at,
        updated_at=user_pref.updated_at,
    )
    
    
@router.delete("/preferences/me", status_code=status.HTTP_204_NO_CONTENT, tags=["Preferences"])
def delete_my_preference(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete current user's preferences.
    
    After deletion, user will need to recreate preferences.
    """
    user_uid = current_user.user_uid
    
    user_pref = db.query(UserPreference).filter(
        UserPreference.user_uid == user_uid
    ).first()
    
    if not user_pref:
        raise HTTPException(status_code=404, detail="Preferences not found")
    
    db.delete(user_pref)
    db.commit()
    
    return None


# =====================================================
# ADMIN ENDPOINTS
# =====================================================

@router.get("/admin/users", response_model=dict, tags=["Admin"])
def get_admin_users_list(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, min_length=2),
    role: Optional[int] = Query(None),
    is_suspended: Optional[bool] = Query(None),
    is_verified: Optional[bool] = Query(None),
    state_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    city_id: Optional[int] = Query(None),
    language: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    sort_by: str = Query("created_at", enum=["created_at", "user_name", "name", "email", "role"]),
    sort_order: str = Query("desc", enum=["asc", "desc"]),
    include_stats: bool = Query(False),
    export: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Get paginated list of all users with advanced filtering"""
    
    query = db.query(User)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                User.user_name.ilike(f"%{search}%"),
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%")
            )
        )
    
    if role is not None:
        if role < UserRole.GUEST or role > UserRole.ADMIN:
            raise HTTPException(status_code=400, detail="Invalid role")
        query = query.filter(User.role == role)
    
    if is_suspended is not None:
        query = query.filter(User.is_suspended == is_suspended)
    
    if is_verified is not None:
        if is_verified:
            query = query.filter(or_(User.email_verified == True, User.mobile_verified == True))
        else:
            query = query.filter(and_(User.email_verified == False, User.mobile_verified == False))
    
    if state_id:
        query = query.filter(User.state_id == state_id)
    if district_id:
        query = query.filter(User.district_id == district_id)
    if city_id:
        query = query.filter(User.city_id == city_id)
    if language:
        query = query.filter(User.language == language)
    if date_from:
        query = query.filter(User.created_at >= date_from)
    if date_to:
        query = query.filter(User.created_at <= date_to)
    
    # Export mode
    if export:
        import csv
        from io import StringIO
        
        all_users = query.order_by(User.created_at.desc()).all()
        output = StringIO()
        writer = csv.writer(output)
        
        headers = ["User UID", "Username", "Name", "Email", "Phone", "Role", "Email Verified", "Mobile Verified", "Suspended", "Language", "State ID", "District ID", "City ID", "Created At"]
        writer.writerow(headers)
        
        for u in all_users:
            writer.writerow([
                u.user_uid, u.user_name or "", u.name or "", u.email or "", u.phone or "",
                schemas.user_role_label(u.role), u.email_verified, u.mobile_verified, u.is_suspended,
                u.language or "", u.state_id or "", u.district_id or "", u.city_id or "",
                u.created_at.isoformat() if u.created_at else ""
            ])
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=users_export_{_get_utc_now().date()}.csv"}
        )
    
    # Sorting
    sort_column_map = {
        "created_at": User.created_at,
        "user_name": User.user_name,
        "name": User.name,
        "email": User.email,
        "role": User.role
    }
    sort_column = sort_column_map.get(sort_by, User.created_at)
    
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)
    
    total_users = query.count()
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()
    
    # Get statistics efficiently (single query per user type)
    user_stats = {}
    if include_stats:
        user_uids = [u.user_uid for u in users]
        if user_uids:
            stats_query = db.query(
                News.user_uid,
                func.count(News.id).label('total_posts'),
                func.sum(News.views_count).label('total_views'),
                func.sum(News.likes_count).label('total_likes'),
                func.sum(News.comments_count).label('total_comments'),
                func.sum(News.shares_count).label('total_shares')
            ).filter(News.user_uid.in_(user_uids)).group_by(News.user_uid).all()
            
            for stat in stats_query:
                user_stats[stat.user_uid] = {
                    "total_posts": stat.total_posts or 0,
                    "total_views": stat.total_views or 0,
                    "total_likes": stat.total_likes or 0,
                    "total_comments": stat.total_comments or 0,
                    "total_shares": stat.total_shares or 0
                }
    
    total_pages = (total_users + limit - 1) // limit
    
    return {
        "metadata": {
            "total": total_users,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1
        },
        "items": [
            {
                "user_uid": u.user_uid,
                "user_name": u.user_name,
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "gender": u.gender,
                "language": u.language,
                "role": u.role,
                "role_name": schemas.user_role_label(u.role),
                "verification": {
                    "email_verified": u.email_verified,
                    "mobile_verified": u.mobile_verified
                },
                "status": {
                    "is_suspended": u.is_suspended,
                    "suspension_reason": u.suspension_reason if u.is_suspended else None,
                    "suspension_until": u.suspended_until if u.is_suspended else None
                },
                "created_at": u.created_at,
                "updated_at": u.updated_at if hasattr(u, 'updated_at') else u.created_at,
                "stats": user_stats.get(u.user_uid) if include_stats else None
            }
            for u in users
        ]
    }


@router.get("/admin/users/stats", tags=["Admin"])
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Get user statistics for admin dashboard"""
    total_users = db.query(User).count()
    suspended_users = db.query(User).filter(User.is_suspended == True).count()
    
    publishers = db.query(User).filter(User.role == UserRole.PUBLISHER).count()
    moderators = db.query(User).filter(User.role == UserRole.MODERATOR).count()
    admins = db.query(User).filter(User.role == UserRole.ADMIN).count()
    employees = db.query(User).filter(User.role == UserRole.EMPLOYEE).count()
    
    week_ago = _get_utc_now() - timedelta(days=7)
    new_users = db.query(User).filter(User.created_at >= week_ago).count()
    
    email_verified = db.query(User).filter(User.email_verified == True).count()
    mobile_verified = db.query(User).filter(User.mobile_verified == True).count()
    
    # Active users = not suspended
    active_users = total_users - suspended_users
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "suspended_users": suspended_users,
        "publishers": publishers,
        "moderators": moderators,
        "admins": admins,
        "employees": employees,
        "new_users_7_days": new_users,
        "verification": {
            "email_verified": email_verified,
            "mobile_verified": mobile_verified,
            "email_verification_rate": round(email_verified / total_users * 100, 2) if total_users > 0 else 0,
            "mobile_verification_rate": round(mobile_verified / total_users * 100, 2) if total_users > 0 else 0
        }
    }


@router.delete("/user/news/{news_uid}", status_code=status.HTTP_204_NO_CONTENT, tags=["User"])
def delete_news_by_user(
    news_uid: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete user's own news"""
    news = db.query(News).filter(
        News.news_uid == news_uid, 
        News.user_uid == current_user.user_uid
    ).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="News not found or unauthorized")
    
    db.delete(news)
    db.commit()
    return None


# =====================================================
# USER SUSPENSION APIS
# =====================================================

@router.post("/users/{user_uid}/suspend", tags=["Admin"])
def suspend_user(
    user_uid: str,
    request: schemas.UserSuspendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Suspend a user"""
    
    if current_user.user_uid == user_uid:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    
    user = db.query(User).filter(User.user_uid == user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_suspended:
        if user.suspended_until and user.suspended_until > _get_utc_now():
            days_left = (user.suspended_until - _get_utc_now()).days
            raise HTTPException(status_code=400, detail=f"User is already suspended for {days_left} more days")
    
    suspended_until = _get_utc_now() + timedelta(days=request.duration_days)
    
    user.is_suspended = True
    user.suspension_reason = request.reason
    user.suspended_at = _get_utc_now()
    user.suspended_until = suspended_until
    user.suspended_by = current_user.user_uid
    user.token_version += 1
    user.updated_at = _get_utc_now()
    
    db.commit()

    record_audit_log(
        db=db,
        user_uid=current_user.user_uid,
        action="SUSPEND_USER",
        resource_type="USER",
        resource_id=user.user_uid,
        changes={"duration_days": request.duration_days, "reason": request.reason},
        status="SUCCESS",
    )
    
    if request.notify_user:
        notification = Notification(
            user_uid=user.user_uid,
            title="Account Suspended",
            message=f"Your account has been suspended for {request.duration_days} days. Reason: {request.reason}",
            notification_type="suspension",
            created_at=_get_utc_now()
        )
        db.add(notification)
        db.commit()
    
    return {
        "user_uid": user.user_uid,
        "user_name": user.user_name or user.name,
        "is_suspended": True,
        "suspension_reason": request.reason,
        "suspended_until": suspended_until,
        "message": f"User suspended successfully until {suspended_until.strftime('%Y-%m-%d %H:%M:%S')}"
    }


@router.post("/users/{user_uid}/activate", tags=["Admin"])
def activate_user(
    user_uid: str,
    request: Optional[schemas.UserActivateRequest] = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Activate a suspended user"""
    
    user = db.query(User).filter(User.user_uid == user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_suspended:
        raise HTTPException(status_code=400, detail="User is already active")
    
    notify_user = True if request is None else request.notify_user
    
    user.is_suspended = False
    user.activated_at = _get_utc_now()
    user.token_version += 1
    user.updated_at = _get_utc_now()
    
    db.commit()

    record_audit_log(
        db=db,
        user_uid=current_user.user_uid,
        action="ACTIVATE_USER",
        resource_type="USER",
        resource_id=user.user_uid,
        changes={"action": "activated"},
        status="SUCCESS",
    )
    
    if notify_user:
        notification = Notification(
            user_uid=user.user_uid,
            title="Account Activated",
            message="Your account has been activated",
            notification_type="activation",
            created_at=_get_utc_now()
        )
        db.add(notification)
        db.commit()
    
    return {
        "user_uid": user.user_uid,
        "user_name": user.user_name or user.name,
        "is_suspended": False,
        "message": "User activated successfully"
    }


@router.get("/users/me/suspension-status", tags=["User"])
def check_my_suspension_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check current user's suspension status"""
    
    user = db.query(User).filter(User.user_uid == current_user.user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    days_remaining = None
    if user.is_suspended and user.suspended_until:
        days_remaining = (user.suspended_until - _get_utc_now()).days
        if days_remaining < 0:
            days_remaining = 0
    
    return {
        "is_suspended": user.is_suspended,
        "suspension_reason": user.suspension_reason if user.is_suspended else None,
        "suspended_at": user.suspended_at if user.is_suspended else None,
        "suspended_until": user.suspended_until if user.is_suspended else None,
        "days_remaining": days_remaining if user.is_suspended else None
    }
    
@router.get("/admin/users_profile/{user_uid}", response_model=dict, tags=["Admin"])
def get_admin_user_details(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    include_sensitive: bool = Query(False, description="Include sensitive data like token_version"),
    include_activity: bool = Query(True, description="Include user activity log"),
    include_preferences: bool = Query(True, description="Include user preferences"),
    include_posts: bool = Query(True, description="Include user posts with pagination"),
    post_limit: int = Query(10, ge=1, le=50, description="Number of posts to show"),
    post_page: int = Query(1, ge=1, description="Page number for posts"),
):
    """Get complete user details for admin"""
    
    user = db.query(User).filter(User.user_uid == user_uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get location names
    state_name = None
    district_name = None
    city_name = None
    
    if user.state_id:
        state = db.query(State).filter(State.id == user.state_id).first()
        state_name = state.name if state else None
    if user.district_id:
        district = db.query(District).filter(District.id == user.district_id).first()
        district_name = district.name if district else None
    if user.city_id:
        city = db.query(City).filter(City.id == user.city_id).first()
        city_name = city.name if city else None
    
    response = {
        "user_uid": user.user_uid,
        "user_name": user.user_name,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "gender": user.gender,
        "date_of_birth": user.date_of_birth,
        "language": user.language,
        "location": {
            "state_id": user.state_id,
            "state_name": state_name,
            "district_id": user.district_id,
            "district_name": district_name,
            "city_id": user.city_id,
            "city_name": city_name
        },
        "role": user.role,
        "role_name": schemas.user_role_label(user.role),
        "verification": {
            "email_verified": user.email_verified,
            "mobile_verified": user.mobile_verified,
            "email_verified_at": None,
            "mobile_verified_at": None
        },
        "account_status": {
            "is_suspended": user.is_suspended,
            "suspension_reason": user.suspension_reason if user.is_suspended else None,
            "suspended_at": user.suspended_at if user.is_suspended else None,
            "suspended_until": user.suspended_until if user.is_suspended else None,
            "suspended_by": user.suspended_by if user.is_suspended else None,
        },
        "timestamps": {
            "created_at": user.created_at,
            "updated_at": user.updated_at if hasattr(user, 'updated_at') else user.created_at,
            "last_login": user.last_login if hasattr(user, 'last_login') else None
        }
    }
    
    # Get suspended_by name
    if user.is_suspended and user.suspended_by:
        suspender = db.query(User).filter(User.user_uid == user.suspended_by).first()
        if suspender:
            response["account_status"]["suspended_by_name"] = suspender.user_name or suspender.name
    
    if include_sensitive:
        response["sensitive"] = {
            "token_version": user.token_version,
        }
    
    # User Preferences
    if include_preferences:
        preferences = db.query(UserPreference).filter(
            UserPreference.user_uid == user_uid
        ).first()
        
        if preferences:
            language = db.query(Language).filter(Language.id == preferences.language_id).first()
            
            response["preferences"] = {
                "language_id": preferences.language_id,
                "language_code": language.code if language else None,
                "language_name": language.name if language else None,
                "location": {
                    "state_id": preferences.state_id,
                    "district_id": preferences.district_id,
                    "city_id": preferences.city_id,
                },
                "categories": [
                    {"id": cat.id, "name": cat.name}
                    for cat in preferences.categories
                ] if preferences.categories else [],
                "created_at": preferences.created_at,
                "updated_at": preferences.updated_at
            }
        else:
            response["preferences"] = None
    
    # Statistics
    total_posts = db.query(News).filter(News.user_uid == user_uid).count()
    approved_posts = db.query(News).filter(News.user_uid == user_uid, News.is_approved == 1).count()
    pending_posts = db.query(News).filter(
        News.user_uid == user_uid,
        News.is_approved == 0,
        News.rejected_at == None
    ).count()
    rejected_posts = db.query(News).filter(
        News.user_uid == user_uid,
        News.rejected_at != None
    ).count()
    
    total_views = db.query(func.sum(News.views_count)).filter(News.user_uid == user_uid).scalar() or 0
    total_likes = db.query(func.sum(News.likes_count)).filter(News.user_uid == user_uid).scalar() or 0
    total_comments = db.query(func.sum(News.comments_count)).filter(News.user_uid == user_uid).scalar() or 0
    total_shares = db.query(func.sum(News.shares_count)).filter(News.user_uid == user_uid).scalar() or 0
    
    avg_views = round(total_views / total_posts, 2) if total_posts > 0 else 0
    engagement_rate = round((total_likes + total_comments + total_shares) / total_views * 100, 2) if total_views > 0 else 0
    
    best_post = db.query(News).filter(
        News.user_uid == user_uid,
        News.is_approved == 1
    ).order_by(desc(News.views_count)).first()
    
    response["statistics"] = {
        "posts": {
            "total": total_posts,
            "approved": approved_posts,
            "pending": pending_posts,
            "rejected": rejected_posts,
            "approval_rate": round(approved_posts / total_posts * 100, 2) if total_posts > 0 else 0
        },
        "engagement": {
            "total_views": total_views,
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": total_shares,
            "avg_views_per_post": avg_views,
            "engagement_rate": engagement_rate
        },
        "best_performing_post": {
            "news_uid": best_post.news_uid,
            "title": best_post.title,
            "views": best_post.views_count,
            "likes": best_post.likes_count
        } if best_post else None
    }
    
    # User Posts
    if include_posts:
        post_query = db.query(News).filter(News.user_uid == user_uid)
        total_posts_count = post_query.count()
        offset = (post_page - 1) * post_limit
        posts = post_query.order_by(desc(News.created_at)).offset(offset).limit(post_limit).all()
        
        response["posts"] = {
            "metadata": {
                "total": total_posts_count,
                "page": post_page,
                "limit": post_limit,
                "total_pages": (total_posts_count + post_limit - 1) // post_limit,
                "has_next": offset + post_limit < total_posts_count,
                "has_previous": post_page > 1
            },
            "items": [
                {
                    "news_uid": p.news_uid,
                    "title": p.title,
                    "summary": p.summary[:200] if p.summary else None,
                    "image_url": p.image_url,
                    "created_at": p.created_at,
                    "status": _get_post_status(p),
                    "engagement": {
                        "views": p.views_count,
                        "likes": p.likes_count,
                        "comments": p.comments_count,
                        "shares": p.shares_count
                    },
                    "categories": [{"id": c.id, "name": c.name} for c in p.categories] if p.categories else []
                }
                for p in posts
            ]
        }
    
    # Activity Log
    if include_activity:
        thirty_days_ago = _get_utc_now() - timedelta(days=30)
        
        daily_activity = db.query(
            func.date(News.created_at).label('date'),
            func.count(News.id).label('posts'),
            func.sum(News.views_count).label('views'),
            func.sum(News.likes_count).label('likes')
        ).filter(
            News.user_uid == user_uid,
            News.created_at >= thirty_days_ago
        ).group_by(func.date(News.created_at)).order_by(func.date(News.created_at)).all()
        
        response["activity"] = {
            "last_30_days": [
                {
                    "date": a.date.isoformat(),
                    "posts": a.posts,
                    "views": a.views or 0,
                    "likes": a.likes or 0
                }
                for a in daily_activity
            ],
            "total_activity": {
                "posts_last_30_days": sum(a.posts for a in daily_activity),
                "views_last_30_days": sum(a.views or 0 for a in daily_activity),
                "likes_last_30_days": sum(a.likes or 0 for a in daily_activity)
            }
        }
    
    # Category Distribution
    category_distribution = db.query(
        Category.id,
        Category.name,
        func.count(News.id).label('count')
    ).join(News.categories).filter(
        News.user_uid == user_uid,
        News.is_approved == 1
    ).group_by(Category.id).order_by(desc('count')).limit(5).all()
    
    response["category_distribution"] = [
        {"id": c.id, "name": c.name, "count": c.count}
        for c in category_distribution
    ]
    
    # Hour Distribution
    hour_distribution = db.query(
        func.extract('hour', News.created_at).label('hour'),
        func.count(News.id).label('count')
    ).filter(
        News.user_uid == user_uid,
        News.is_approved == 1
    ).group_by('hour').order_by('hour').all()
    
    response["hour_distribution"] = [
        {"hour": int(h.hour), "posts": h.count}
        for h in hour_distribution
    ]
    
    return response
# routes/user_routes.py - Add these endpoints

from models.user import DeviceToken
from services.fcm_service import fcm_service

@router.post("/device/token/register", tags=["Notifications"])
def register_device_token(
    fcm_token: str = Body(..., embed=True),
    device_type: str = Body(..., embed=True),
    device_name: Optional[str] = Body(None, embed=True),
    app_version: Optional[str] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register device FCM token for push notifications
    Called from mobile app on:
    - First launch
    - User login
    - Token refresh
    """
    try:
        # Check if token already exists
        existing = db.query(DeviceToken).filter(
            DeviceToken.fcm_token == fcm_token
        ).first()
        
        if existing:
            # Update existing token (user might have logged in)
            existing.user_uid = current_user.user_uid
            existing.device_type = device_type
            existing.device_name = device_name
            existing.app_version = app_version
            existing.is_active = True
            existing.updated_at = datetime.now(timezone.utc)
            db.commit()
            
            # Subscribe to user's preferred topics
            subscribe_user_to_topics(db, current_user.user_uid, fcm_token)
            
        else:
            # Create new token record
            new_token = DeviceToken(
                user_uid=current_user.user_uid,
                fcm_token=fcm_token,
                device_type=device_type,
                device_name=device_name,
                app_version=app_version,
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(new_token)
            db.commit()
            
            # Subscribe to topics
            subscribe_user_to_topics(db, current_user.user_uid, fcm_token)
        
        return {
            "message": "Device token registered successfully",
            "status": "success"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register device")


@router.delete("/device/token/unregister", tags=["Notifications"])
def unregister_device_token(
    fcm_token: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unregister device token (when user logs out)"""
    try:
        device_token = db.query(DeviceToken).filter(
            DeviceToken.fcm_token == fcm_token,
            DeviceToken.user_uid == current_user.user_uid
        ).first()
        
        if device_token:
            device_token.is_active = False
            db.commit()
        
        return {"message": "Device token unregistered successfully"}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error unregistering token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unregister device")


def subscribe_user_to_topics(db: Session, user_uid: str, fcm_token: str):
    """Subscribe user to relevant topics based on preferences"""
    try:
        topics = ["all_users", "hypernews_news"]
        
        # Get user preferences
        from models.user import UserPreference
        prefs = db.query(UserPreference).filter(
            UserPreference.user_uid == user_uid
        ).first()
        
        if prefs:
            # Subscribe to category topics
            for category in prefs.categories:
                topics.append(f"category_{category.id}")
        
        # Subscribe to topics
        fcm_service.subscribe_to_topic([fcm_token], topics)
        
    except Exception as e:
        logger.error(f"Error subscribing to topics: {str(e)}")