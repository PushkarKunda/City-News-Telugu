# routes/base_location_routes.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.params import Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, asc, text
from datetime import datetime, timezone
import logging

from database import get_db
from models.base_location import Language, State, District, City
from models.news import Category, News
from models.user import User
from auth.dependencies import admin_required, get_current_user, get_optional_user, require_roles
from schemas import (
    CategoryOut, LanguageCreate, LanguageOut, LanguageResponse,
    StateCreate, StateLanguageResponse, StateOut,
    DistrictCreate, DistrictOut,
    CityCreate, CityOut, UserRole
)

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/base", tags=["Base Location"])

# =========================================================
# CONSTANTS
# =========================================================
MAX_NAME_LENGTH = 100
MAX_CODE_LENGTH = 10
MAX_SEARCH_LIMIT = 500
DEFAULT_PAGE_LIMIT = 100


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def validate_name(name: str, entity_type: str) -> str:
    """Validate and sanitize location name"""
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail=f"{entity_type} name is required")
    
    name = name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail=f"{entity_type} name must be at least 2 characters")
    if len(name) > MAX_NAME_LENGTH:
        raise HTTPException(status_code=400, detail=f"{entity_type} name cannot exceed {MAX_NAME_LENGTH} characters")
    
    return name


def validate_code(code: str) -> str:
    """Validate language code"""
    if not code or not code.strip():
        raise HTTPException(status_code=400, detail="Language code is required")
    
    code = code.strip().lower()
    if len(code) < 2:
        raise HTTPException(status_code=400, detail="Language code must be at least 2 characters")
    if len(code) > MAX_CODE_LENGTH:
        raise HTTPException(status_code=400, detail=f"Language code cannot exceed {MAX_CODE_LENGTH} characters")
    
    # Allow only letters
    if not code.isalpha():
        raise HTTPException(status_code=400, detail="Language code must contain only letters")
    
    return code


def log_admin_action(action: str, entity_type: str, entity_id: int, entity_name: str, admin_uid: str):
    """Log admin actions for audit trail"""
    logger.info(f"ADMIN ACTION: {action} - {entity_type} (ID: {entity_id}, Name: {entity_name}) by {admin_uid}")


# =========================================================
# LANGUAGES (Public Read, Admin Write)
# =========================================================

# ✅ PUBLIC ENDPOINT - No auth required for reading active languages
@router.get(
    "/languages", 
    response_model=List[LanguageOut],
    summary="Get all active languages"
)
def get_languages(
    search: Optional[str] = Query(None, min_length=2, max_length=50, description="Search by name or code"),
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_SEARCH_LIMIT, description="Number of records"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db)
):
    """
    Get all active languages - PUBLIC ENDPOINT
    
    Used for:
    - User onboarding (language selection)
    - Settings page
    - Content filtering
    No authentication required.
    """
    try:
        query = db.query(Language).filter(Language.is_active == True)
        
        if search:
            query = query.filter(
                or_(
                    Language.name.ilike(f"%{search}%"),
                    Language.code.ilike(f"%{search}%")
                )
            )
        
        total = query.count()
        languages = query.order_by(asc(Language.display_order), asc(Language.name)).offset(offset).limit(limit).all()
        
        return languages
        
    except Exception as e:
        logger.error(f"Error fetching languages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch languages")


# ✅ ADMIN ONLY - Get all languages including inactive
@router.get(
    "/languages/admin", 
    response_model=List[LanguageOut],
    summary="Get all languages (Admin only)"
)
def get_all_languages_admin(
    search: Optional[str] = Query(None, min_length=2, max_length=50),
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_SEARCH_LIMIT),
    offset: int = Query(0, ge=0),
    include_inactive: bool = Query(True, description="Include inactive languages"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get all languages including inactive - ADMIN ONLY"""
    try:
        query = db.query(Language)
        
        if not include_inactive:
            query = query.filter(Language.is_active == True)
        
        if search:
            query = query.filter(
                or_(
                    Language.name.ilike(f"%{search}%"),
                    Language.code.ilike(f"%{search}%")
                )
            )
        
        total = query.count()
        languages = query.order_by(asc(Language.name)).offset(offset).limit(limit).all()
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_next": offset + limit < total,
            "items": languages
        }
        
    except Exception as e:
        logger.error(f"Error fetching languages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch languages")


@router.post(
    "/languages", 
    response_model=LanguageResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new language"
)
def create_language(
    language: LanguageCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Create a new language (Admin only)"""
    try:
        code = validate_code(language.code)
        name = validate_name(language.name, "Language")
        
        # Check if language with same code exists
        db_lang = db.query(Language).filter(
            func.lower(Language.code) == code
        ).first()
        if db_lang:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Language with this code already exists"
            )
        
        # Check if language with same name exists
        db_lang = db.query(Language).filter(
            func.lower(Language.name) == name.lower()
        ).first()
        if db_lang:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Language with this name already exists"
            )
        
        # Get max display order
        max_order = db.query(func.max(Language.display_order)).scalar() or 0
        
        new_lang = Language(
            code=code, 
            name=name,
            display_order=max_order + 1,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_lang)
        db.commit()
        db.refresh(new_lang)
        
        log_admin_action("CREATE", "Language", new_lang.id, new_lang.name, current_user.user_uid)
        
        return new_lang
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating language: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create language")


@router.get(
    "/languages/{language_id}", 
    response_model=LanguageOut,
    summary="Get language by ID"
)
def get_language(
    language_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get language details by ID
    
    - Public users: Can only see active languages
    - Admin: Can see both active and inactive
    """
    try:
        language = db.query(Language).filter(Language.id == language_id).first()
        if not language:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language with id {language_id} not found"
            )
        
        # Check if language is inactive and user is not admin
        if not language.is_active:
            if not current_user or current_user.role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=403,
                    detail="Language is inactive. Admin access required."
                )
        
        return language
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching language: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch language")


@router.put(
    "/languages/{language_id}", 
    response_model=LanguageOut,
    summary="Update language"
)
def update_language(
    language_id: int,
    language: LanguageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update language details (Admin only)"""
    try:
        db_lang = db.query(Language).filter(Language.id == language_id).first()
        if not db_lang:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language with id {language_id} not found"
            )
        
        old_name = db_lang.name
        old_code = db_lang.code
        
        # Update code
        if language.code:
            code = validate_code(language.code)
            if code != db_lang.code:
                existing = db.query(Language).filter(
                    func.lower(Language.code) == code,
                    Language.id != language_id
                ).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Language with this code already exists"
                    )
                db_lang.code = code
        
        # Update name
        if language.name:
            name = validate_name(language.name, "Language")
            if name.lower() != db_lang.name.lower():
                existing = db.query(Language).filter(
                    func.lower(Language.name) == name.lower(),
                    Language.id != language_id
                ).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Language with this name already exists"
                    )
                db_lang.name = name

        # Update native name
      
        
        db_lang.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_lang)
        
        log_admin_action("UPDATE", "Language", language_id, f"{old_name} -> {db_lang.name}", current_user.user_uid)
        
        return db_lang
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating language: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update language")


@router.delete(
    "/languages/{language_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete language"
)
def delete_language(
    language_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Delete a language (Admin only)"""
    try:
        language = db.query(Language).filter(Language.id == language_id).first()
        if not language:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Language with id {language_id} not found"
            )
        
        # Check if language is used by any states
        used_by_states = db.query(State).filter(State.language_id == language_id).count()
        if used_by_states > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete language used by {used_by_states} state(s). Remove associations first."
            )
        
        language_name = language.name
        db.delete(language)
        db.commit()
        
        log_admin_action("DELETE", "Language", language_id, language_name, current_user.user_uid)
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting language: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete language")


# =========================================================
# STATES (Public Read, Admin Write)
# =========================================================

# ✅ PUBLIC ENDPOINT - No auth required
@router.get(
    "/states", 
    response_model=List[StateOut],
    summary="Get all states"
)
def get_states(
    search: Optional[str] = Query(None, min_length=2, max_length=50, description="Search by name"),
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_SEARCH_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all active states - PUBLIC ENDPOINT"""
    try:
        query = db.query(State).options(joinedload(State.language)).filter(
            State.is_active == True
        )
        
        if search:
            query = query.filter(State.name.ilike(f"%{search}%"))
        
        total = query.count()
        states = query.order_by(asc(State.name)).offset(offset).limit(limit).all()
        
        return states
        
    except Exception as e:
        logger.error(f"Error fetching states: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch states")


@router.post(
    "/states", 
    response_model=StateOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new state"
)
def create_state(
    state: StateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Create a new state (Admin only)"""
    try:
        name = validate_name(state.name, "State")
        
        existing = db.query(State).filter(
            func.lower(State.name) == name.lower()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="State already exists"
            )
        
        db_state = State(
            name=name,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(db_state)
        db.commit()
        db.refresh(db_state)
        
        log_admin_action("CREATE", "State", db_state.id, db_state.name, current_user.user_uid)
        
        return db_state
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating state: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create state")


@router.get(
    "/states/{state_id}", 
    response_model=StateOut,
    summary="Get state details"
)
def get_state(
    state_id: int,
    db: Session = Depends(get_db)
):
    """Get state details by ID - PUBLIC"""
    try:
        state = db.query(State).options(joinedload(State.language)).filter(
            State.id == state_id,
            State.is_active == True
        ).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"State with id {state_id} not found or inactive"
            )
        return state
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching state: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch state")


@router.put(
    "/states/{state_id}", 
    response_model=StateOut,
    summary="Update state"
)
def update_state(
    state_id: int,
    state: StateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update state details (Admin only)"""
    try:
        db_state = db.query(State).filter(State.id == state_id).first()
        if not db_state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"State with id {state_id} not found"
            )
        
        old_name = db_state.name
        
        if state.name:
            name = validate_name(state.name, "State")
            if name.lower() != db_state.name.lower():
                existing = db.query(State).filter(
                    func.lower(State.name) == name.lower(),
                    State.id != state_id
                ).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="State with this name already exists"
                    )
                db_state.name = name
        
        db_state.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_state)
        
        log_admin_action("UPDATE", "State", state_id, f"{old_name} -> {db_state.name}", current_user.user_uid)
        
        return db_state
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating state: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update state")


@router.delete(
    "/states/{state_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete state"
)
def delete_state(
    state_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Delete a state (Admin only)"""
    try:
        state = db.query(State).filter(State.id == state_id).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"State with id {state_id} not found"
            )
        
        # Check if state has districts
        districts_count = db.query(District).filter(District.state_id == state_id).count()
        if districts_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete state with {districts_count} district(s). Delete districts first."
            )
        
        state_name = state.name
        db.delete(state)
        db.commit()
        
        log_admin_action("DELETE", "State", state_id, state_name, current_user.user_uid)
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting state: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete state")


# =========================================================
# LANGUAGE-STATE MAPPING (Admin only for write)
# =========================================================

@router.post(
    "/states/{state_id}/language", 
    status_code=status.HTTP_201_CREATED,
    response_model=LanguageResponse,
    summary="Link language to state"
)
def link_language_to_state(
    state_id: int, 
    language_id: int = Query(..., description="Language ID to link"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Link a language to a state (Admin only)"""
    try:
        state = db.query(State).filter(State.id == state_id).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="State not found"
            )
        
        language = db.query(Language).filter(Language.id == language_id).first()
        if not language:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Language not found"
            )
        
        state.language_id = language.id
        state.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(language)
        
        log_admin_action("LINK", "State-Language", state_id, f"{state.name} -> {language.name}", current_user.user_uid)
        
        return language
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error linking language to state: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to link language to state")


@router.get(
    "/states/{state_id}/language", 
    response_model=StateLanguageResponse,
    summary="Get language for a state"
)
def get_state_language(
    state_id: int,
    db: Session = Depends(get_db)
):
    """Get language linked to a state - PUBLIC"""
    try:
        state = db.query(State).filter(State.id == state_id).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="State not found"
            )
        
        if not state.language:
            return StateLanguageResponse(
                state=state,
                language=None,
                message=f"State '{state.name}' does not have a language linked yet."
            )
        
        return StateLanguageResponse(
            state=state,
            language=state.language,
            message=f"Language linked successfully for state '{state.name}'."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching state language: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch state language")


@router.delete(
    "/states/{state_id}/language", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlink language from state"
)
def unlink_state_language(
    state_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Remove language from state (Admin only)"""
    try:
        state = db.query(State).filter(State.id == state_id).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="State not found"
            )
        
        old_language = state.language.name if state.language else "None"
        state.language_id = None
        state.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        log_admin_action("UNLINK", "State-Language", state_id, f"{state.name} (was: {old_language})", current_user.user_uid)
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error unlinking state language: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unlink language from state")


# =========================================================
# DISTRICTS (Public Read, Admin Write)
# =========================================================

# ✅ PUBLIC ENDPOINT - No auth required
@router.get(
    "/districts", 
    response_model=List[DistrictOut],
    summary="Get all districts"
)
def get_districts(
    state_id: Optional[int] = Query(None, description="Filter by state"),
    search: Optional[str] = Query(None, min_length=2, max_length=50, description="Search by name"),
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_SEARCH_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all districts with optional filters - PUBLIC"""
    try:
        query = db.query(District).options(joinedload(District.state))
        
        if state_id:
            query = query.filter(District.state_id == state_id)
        
        if search:
            query = query.filter(District.name.ilike(f"%{search}%"))
        
        total = query.count()
        districts = query.order_by(asc(District.name)).offset(offset).limit(limit).all()
        
        return districts
        
    except Exception as e:
        logger.error(f"Error fetching districts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch districts")


@router.post(
    "/districts", 
    response_model=DistrictOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new district"
)
def create_district(
    district: DistrictCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Create a new district (Admin only)"""
    try:
        name = validate_name(district.name, "District")
        
        # Verify state exists
        state = db.query(State).filter(State.id == district.state_id).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="State not found"
            )
        
        # Check for duplicate district in same state
        existing = db.query(District).filter(
            func.lower(District.name) == name.lower(),
            District.state_id == district.state_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="District already exists in this state"
            )
        
        db_district = District(
            name=name, 
            state_id=district.state_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(db_district)
        db.commit()
        db.refresh(db_district)
        
        log_admin_action("CREATE", "District", db_district.id, f"{db_district.name} (State: {state.name})", current_user.user_uid)
        
        return db_district
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating district: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create district")


@router.get(
    "/districts/{district_id}", 
    response_model=DistrictOut,
    summary="Get district details"
)
def get_district(
    district_id: int,
    db: Session = Depends(get_db)
):
    """Get district details by ID - PUBLIC"""
    try:
        district = db.query(District).options(joinedload(District.state)).filter(District.id == district_id).first()
        if not district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District with id {district_id} not found"
            )
        return district
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching district: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch district")


@router.put(
    "/districts/{district_id}", 
    response_model=DistrictOut,
    summary="Update district"
)
def update_district(
    district_id: int,
    district: DistrictCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update district details (Admin only)"""
    try:
        db_district = db.query(District).filter(District.id == district_id).first()
        if not db_district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District with id {district_id} not found"
            )
        
        old_name = db_district.name
        
        if district.name:
            name = validate_name(district.name, "District")
            if name.lower() != db_district.name.lower():
                existing = db.query(District).filter(
                    func.lower(District.name) == name.lower(),
                    District.state_id == db_district.state_id,
                    District.id != district_id
                ).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="District with this name already exists in this state"
                    )
                db_district.name = name
        
        if district.state_id and district.state_id != db_district.state_id:
            state = db.query(State).filter(State.id == district.state_id).first()
            if not state:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="State not found"
                )
            
            existing = db.query(District).filter(
                func.lower(District.name) == db_district.name.lower(),
                District.state_id == district.state_id,
                District.id != district_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="District with this name already exists in the target state"
                )
            db_district.state_id = district.state_id
        
        db_district.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_district)
        
        log_admin_action("UPDATE", "District", district_id, f"{old_name} -> {db_district.name}", current_user.user_uid)
        
        return db_district
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating district: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update district")


@router.delete(
    "/districts/{district_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete district"
)
def delete_district(
    district_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Delete a district (Admin only)"""
    try:
        district = db.query(District).filter(District.id == district_id).first()
        if not district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"District with id {district_id} not found"
            )
        
        # Check if district has cities
        cities_count = db.query(City).filter(City.district_id == district_id).count()
        if cities_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete district with {cities_count} city(s). Delete cities first."
            )
        
        district_name = district.name
        state_name = district.state.name if district.state else "Unknown"
        db.delete(district)
        db.commit()
        
        log_admin_action("DELETE", "District", district_id, f"{district_name} (State: {state_name})", current_user.user_uid)
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting district: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete district")


# =========================================================
# CITIES (Public Read, Admin Write)
# =========================================================

# ✅ PUBLIC ENDPOINT - No auth required
@router.get(
    "/cities", 
    response_model=List[CityOut],
    summary="Get all cities"
)
def get_cities(
    state_id: Optional[int] = Query(None, description="Filter by state"),
    district_id: Optional[int] = Query(None, description="Filter by district"),
    search: Optional[str] = Query(None, min_length=2, max_length=50, description="Search by name"),
    limit: int = Query(DEFAULT_PAGE_LIMIT, ge=1, le=MAX_SEARCH_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all cities with optional filters - PUBLIC"""
    try:
        query = db.query(City).options(
            joinedload(City.district).joinedload(District.state)
        )
        
        if district_id:
            query = query.filter(City.district_id == district_id)
        elif state_id:
            query = query.join(City.district).filter(District.state_id == state_id)
        
        if search:
            query = query.filter(City.name.ilike(f"%{search}%"))
        
        total = query.count()
        cities = query.order_by(asc(City.name)).offset(offset).limit(limit).all()
        
        return cities
        
    except Exception as e:
        logger.error(f"Error fetching cities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch cities")


@router.post(
    "/cities", 
    response_model=CityOut, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new city"
)
def create_city(
    city: CityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Create a new city (Admin only)"""
    try:
        name = validate_name(city.name, "City")
        
        district = db.query(District).options(joinedload(District.state)).filter(District.id == city.district_id).first()
        if not district:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="District not found"
            )
        
        existing = db.query(City).filter(
            func.lower(City.name) == name.lower(),
            City.district_id == city.district_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="City already exists in this district"
            )
        
        db_city = City(
            name=name, 
            district_id=city.district_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(db_city)
        db.commit()
        db.refresh(db_city)
        
        log_admin_action("CREATE", "City", db_city.id, f"{db_city.name} (District: {district.name}, State: {district.state.name if district.state else 'Unknown'})", current_user.user_uid)
        
        return db_city
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating city: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create city")


@router.get(
    "/cities/{city_id}", 
    response_model=CityOut,
    summary="Get city details"
)
def get_city(
    city_id: int,
    db: Session = Depends(get_db)
):
    """Get city details by ID - PUBLIC"""
    try:
        city = db.query(City).options(
            joinedload(City.district).joinedload(District.state)
        ).filter(City.id == city_id).first()
        if not city:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"City with id {city_id} not found"
            )
        return city
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching city: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch city")


@router.put(
    "/cities/{city_id}", 
    response_model=CityOut,
    summary="Update city"
)
def update_city(
    city_id: int,
    city: CityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update city details (Admin only)"""
    try:
        db_city = db.query(City).filter(City.id == city_id).first()
        if not db_city:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"City with id {city_id} not found"
            )
        
        old_name = db_city.name
        
        if city.name:
            name = validate_name(city.name, "City")
            if name.lower() != db_city.name.lower():
                existing = db.query(City).filter(
                    func.lower(City.name) == name.lower(),
                    City.district_id == db_city.district_id,
                    City.id != city_id
                ).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="City with this name already exists in this district"
                    )
                db_city.name = name
        
        if city.district_id and city.district_id != db_city.district_id:
            district = db.query(District).filter(District.id == city.district_id).first()
            if not district:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="District not found"
                )
            
            existing = db.query(City).filter(
                func.lower(City.name) == db_city.name.lower(),
                City.district_id == city.district_id,
                City.id != city_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="City with this name already exists in the target district"
                )
            db_city.district_id = city.district_id
        
        db_city.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_city)
        
        log_admin_action("UPDATE", "City", city_id, f"{old_name} -> {db_city.name}", current_user.user_uid)
        
        return db_city
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating city: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update city")


@router.delete(
    "/cities/{city_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete city"
)
def delete_city(
    city_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Delete a city (Admin only)"""
    try:
        city = db.query(City).filter(City.id == city_id).first()
        if not city:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"City with id {city_id} not found"
            )
        
        # Check if city is used in any news
        news_count = db.query(func.count(News.id)).filter(News.city_id == city_id).scalar() or 0
        if news_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete city used by {news_count} news article(s). Update news first."
            )
        
        city_name = city.name
        district_name = city.district.name if city.district else "Unknown"
        db.delete(city)
        db.commit()
        
        log_admin_action("DELETE", "City", city_id, f"{city_name} (District: {district_name})", current_user.user_uid)
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting city: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete city")


# =========================================================
# SEARCH & STATS (Public)
# =========================================================

@router.get(
    "/search", 
    summary="Search locations"
)
def search_locations(
    query: str = Query(..., min_length=2, max_length=50, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search across all location types - PUBLIC"""
    try:
        results = []
        
        # Search states
        states = db.query(State).filter(
            State.is_active == True,
            State.name.ilike(f"%{query}%")
        ).limit(limit).all()
        for state in states:
            results.append({
                "id": state.id,
                "name": state.name,
                "type": "state",
                "display_name": state.name
            })
        
        # Search districts
        districts = db.query(District).join(State).filter(
            State.is_active == True,
            District.name.ilike(f"%{query}%")
        ).limit(limit).all()
        for district in districts:
            results.append({
                "id": district.id,
                "name": district.name,
                "type": "district",
                "state_id": district.state_id,
                "state_name": district.state.name if district.state else None,
                "display_name": f"{district.name}, {district.state.name if district.state else ''}"
            })
        
        # Search cities
        cities = db.query(City).join(District).join(State).filter(
            State.is_active == True,
            City.name.ilike(f"%{query}%")
        ).limit(limit).all()
        for city in cities:
            results.append({
                "id": city.id,
                "name": city.name,
                "type": "city",
                "district_id": city.district_id,
                "district_name": city.district.name if city.district else None,
                "state_name": city.district.state.name if city.district and city.district.state else None,
                "display_name": f"{city.name}, {city.district.name if city.district else ''}, {city.district.state.name if city.district and city.district.state else ''}"
            })
        
        return results[:limit]
        
    except Exception as e:
        logger.error(f"Error searching locations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search locations")


@router.get(
    "/stats", 
    summary="Get location statistics"
)
def get_location_stats(
    db: Session = Depends(get_db)
):
    """Get statistics for locations - PUBLIC"""
    try:
        return {
            "total_languages": db.query(Language).filter(Language.is_active == True).count(),
            "total_states": db.query(State).filter(State.is_active == True).count(),
            "total_districts": db.query(District).count(),
            "total_cities": db.query(City).count(),
            "total_categories": db.query(Category).filter(Category.is_active == True).count()
        }
        
    except Exception as e:
        logger.error(f"Error fetching location stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")


# =========================================================
# HIERARCHICAL DATA (Public)
# =========================================================

@router.get(
    "/hierarchy/states/{state_id}", 
    summary="Get complete hierarchy for a state"
)
def get_state_hierarchy(
    state_id: int,
    db: Session = Depends(get_db)
):
    """Get state with all its districts and cities - PUBLIC"""
    try:
        state = db.query(State).filter(State.id == state_id, State.is_active == True).first()
        if not state:
            raise HTTPException(status_code=404, detail="State not found")
        
        districts = db.query(District).filter(District.state_id == state_id).all()
        
        result = {
            "id": state.id,
            "name": state.name,
            "language": {
                "id": state.language.id,
                "code": state.language.code,
                "name": state.language.name
            } if state.language else None,
            "districts": []
        }
        
        for district in districts:
            cities = db.query(City).filter(City.district_id == district.id).all()
            result["districts"].append({
                "id": district.id,
                "name": district.name,
                "cities": [
                    {"id": city.id, "name": city.name}
                    for city in cities
                ]
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching state hierarchy: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch hierarchy")


# =========================================================
# BULK OPERATIONS (Admin only)
# =========================================================

@router.post(
    "/languages/reorder",
    summary="Reorder languages"
)
def reorder_languages(
    language_ids: List[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Reorder languages by display order (Admin only)"""
    try:
        for idx, lang_id in enumerate(language_ids):
            db.query(Language).filter(Language.id == lang_id).update(
                {"display_order": idx, "updated_at": datetime.now(timezone.utc)}
            )
        db.commit()
        return {"message": "Languages reordered successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error reordering languages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reorder languages")


@router.post(
    "/languages/{language_id}/toggle-active",
    summary="Toggle language active status"
)
def toggle_language_active(
    language_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Toggle language active status (Admin only)"""
    try:
        language = db.query(Language).filter(Language.id == language_id).first()
        if not language:
            raise HTTPException(status_code=404, detail="Language not found")
        
        language.is_active = not language.is_active
        language.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        return {
            "message": f"Language '{language.name}' {'activated' if language.is_active else 'deactivated'}",
            "is_active": language.is_active
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling language: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle language")


# =========================================================
# HEALTH CHECK
# =========================================================

@router.get("/health", tags=["Health"])
def base_location_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for base location service"""
    try:
        db.execute(text("SELECT 1"))
        language_count = db.query(Language).count()
        state_count = db.query(State).count()
        
        return {
            "status": "healthy",
            "service": "base_location_router",
            "services": {
                "api": "running",
                "database": "connected"
            },
            "languages_count": language_count,
            "states_count": state_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )