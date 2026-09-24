# routes/content_routes.py
"""
Content Routes for Hyperlocal News API.
Manages advertisements, sponsored posts, events, polls, YouTube shorts,
scheduling, flagging, tags, expiry, bulk operations, and analytics.
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, desc, and_, text
import logging
import random

from auth.dependencies import (
    get_current_user, admin_required, require_roles, get_optional_user,
    moderator_required, publisher_required
)
from database import get_db
from models.base_location import State, District, City, Language
from models.user import User, UserPreference
from models.content import (
    AdImpression, Advertisement, SponsoredImpression, SponsoredPost,
    Event, Poll, ContentSchedule, FlaggedContent,
    ContentTag, ContentTagMapping, ContentVersion
)
from models.shorts import YouTubeShort
from models.engagement import Notification
from schemas import (
    AdvertisementCreate, AdvertisementOut, EventOut, PollDetailOut,
    PollOut, PollVote, SponsoredPostCreate, EventCreate, PollCreate,
    NewsShortCreate, SponsoredPostOut, PaginatedAdvertisementsOut,
    PaginatedSponsoredPostsOut, AdTargeting, AdminNotificationRequest,
    ScheduledContentCreate, ScheduledContentOut,
    FlaggedContentCreate, FlaggedContentOut, FlaggedContentReview,
    TagCreate, TagOut, ContentTagsUpdate, TaggedContentOut,
    ContentVersionOut, ContentAnalyticsOut, ContentExpiryUpdate,
    ExpiringContentOut, BulkOperation, BulkOperationResponse,
    ContentSearchResults, RelatedContentOut, RelatedContentCreate,
    ContentTemplateCreate, ContentTemplateOut, ReviewQueueOut,
    ContentAnalyticsOverviewOut, DailyReportOut, MonthlyReportOut,
    UserRole,
)
from utility import generate_event_uid, generate_poll_uid

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["Content"])

# =========================================================
# CONSTANTS
# =========================================================
MAX_TITLE_LENGTH = 200
MAX_CONTENT_LENGTH = 5000
MIN_OPTIONS_PER_POLL = 2
MAX_OPTIONS_PER_POLL = 10
DEFAULT_LIMIT = 50
MAX_LIMIT = 200


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def validate_dates(start_date: datetime, end_date: datetime) -> None:
    if start_date >= end_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")


def validate_location_ids(state_id: int = None, district_id: int = None, city_id: int = None, db: Session = None):
    if state_id:
        state = db.query(State).filter(State.id == state_id).first()
        if not state:
            raise HTTPException(status_code=400, detail=f"Invalid state ID: {state_id}")
    if district_id:
        district = db.query(District).filter(District.id == district_id).first()
        if not district:
            raise HTTPException(status_code=400, detail=f"Invalid district ID: {district_id}")
    if city_id:
        city = db.query(City).filter(City.id == city_id).first()
        if not city:
            raise HTTPException(status_code=400, detail=f"Invalid city ID: {city_id}")


def validate_language_id(language_id: int, db: Session) -> None:
    if language_id:
        language = db.query(Language).filter(Language.id == language_id).first()
        if not language:
            raise HTTPException(status_code=400, detail=f"Invalid language ID: {language_id}")


def log_admin_action(action: str, entity_type: str, entity_id: int, details: str, admin_uid: str):
    logger.info(f"ADMIN ACTION: {action} - {entity_type} (ID: {entity_id}) - {details} by {admin_uid}")


def get_content_model(content_type: str):
    mapping = {
        "sponsored_post": SponsoredPost,
        "advertisement": Advertisement,
        "event": Event,
        "poll": Poll
    }
    return mapping.get(content_type)


def get_user_preferences(user_uid: str, db: Session):
    user_pref = db.query(UserPreference).filter(UserPreference.user_uid == user_uid).first()
    if not user_pref:
        user = db.query(User).filter(User.user_uid == user_uid).first()
        if user:
            class TempPref:
                pass
            user_pref = TempPref()
            user_pref.city_id = user.city_id
            user_pref.district_id = user.district_id
            user_pref.state_id = user.state_id
            user_pref.language_id = None
            user_pref.gender = user.gender
    return user_pref


def calculate_sponsored_score(post, user_pref):
    score = 0
    if user_pref:
        if post.city_id and user_pref.city_id and post.city_id == user_pref.city_id:
            score += 100
        elif post.district_id and user_pref.district_id and post.district_id == user_pref.district_id:
            score += 50
        elif post.state_id and user_pref.state_id and post.state_id == user_pref.state_id:
            score += 25
        if post.language_id and user_pref.language_id and post.language_id == user_pref.language_id:
            score += 40
        if post.target_gender and user_pref.gender and post.target_gender == user_pref.gender:
            score += 20
    return score


# =========================================================
# EVENTS (Public Read, PUBLISHER+ Create, MODERATOR+ Approve)
# =========================================================

@router.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Create a new event (PUBLISHER, MODERATOR, ADMIN)"""
    try:
        if event.event_date < datetime.now(timezone.utc).date():
            raise HTTPException(status_code=400, detail="Event date cannot be in the past")

        validate_location_ids(event.state_id, event.district_id, event.city_id, db)
        validate_language_id(event.language_id, db)

        event_data = event.dict()
        event_data["event_uid"] = generate_event_uid()
        event_data["is_approved"] = False
        event_data["created_by"] = current_user.user_uid
        event_data["created_at"] = datetime.now(timezone.utc)

        new_event = Event(**event_data)
        db.add(new_event)
        db.commit()
        db.refresh(new_event)

        log_admin_action("CREATE", "Event", new_event.id, f"Title: {event.title}", current_user.user_uid)
        return new_event

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create event")


@router.get("/events", response_model=dict)
def get_all_approved_events(
    search: Optional[str] = Query(None, min_length=2, max_length=100),
    state_id: Optional[int] = Query(None),
    district_id: Optional[int] = Query(None),
    city_id: Optional[int] = Query(None),
    is_online: Optional[bool] = Query(None),
    upcoming_only: bool = Query(True),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all approved events (Public)"""
    try:
        query = db.query(Event).filter(Event.is_approved == True)

        if upcoming_only:
            query = query.filter(Event.event_date >= datetime.now(timezone.utc).date())

        if search:
            query = query.filter(
                or_(
                    Event.title.ilike(f"%{search}%"),
                    Event.description.ilike(f"%{search}%"),
                    Event.location.ilike(f"%{search}%")
                )
            )

        if state_id:
            query = query.filter(Event.state_id == state_id)
        if district_id:
            query = query.filter(Event.district_id == district_id)
        if city_id:
            query = query.filter(Event.city_id == city_id)
        if is_online is not None:
            query = query.filter(Event.is_online == is_online)

        total = query.count()
        events = query.order_by(Event.event_date.asc()).offset(offset).limit(limit).all()

        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": events}

    except Exception as e:
        logger.error(f"Error fetching events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch events")


@router.get("/events/{event_uid}", response_model=EventOut)
def get_event_by_uid(event_uid: str, db: Session = Depends(get_db)):
    """Get event details by UID (Public)"""
    try:
        event = db.query(Event).filter(Event.event_uid == event_uid).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return event
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch event")


@router.get("/admin/events/pending", response_model=dict)
def get_pending_events(
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Get all events pending approval (MODERATOR, ADMIN)"""
    try:
        events = db.query(Event).filter(Event.is_approved == False).order_by(desc(Event.created_at)).offset(offset).limit(limit).all()
        total = db.query(Event).filter(Event.is_approved == False).count()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": events}
    except Exception as e:
        logger.error(f"Error fetching pending events: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending events")


@router.put("/admin/events/{event_id}/approval", status_code=status.HTTP_200_OK)
def approve_event(
    event_id: int,
    status_approved: bool = Query(...),
    rejection_reason: Optional[str] = Query(None, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Approve or reject an event (MODERATOR, ADMIN)"""
    try:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        event.is_approved = status_approved
        event.approved_at = datetime.now(timezone.utc) if status_approved else None
        event.approved_by = current_user.user_uid if status_approved else None
        event.rejection_reason = rejection_reason if not status_approved else None
        event.updated_at = datetime.now(timezone.utc)

        db.commit()
        log_admin_action("APPROVE" if status_approved else "REJECT", "Event", event_id,
                         f"Title: {event.title}", current_user.user_uid)
        return {"message": f"Event {'approved' if status_approved else 'rejected'} successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process event")


@router.delete("/admin/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Delete an event (MODERATOR, ADMIN)"""
    try:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        log_admin_action("DELETE", "Event", event_id, f"Title: {event.title}", current_user.user_uid)
        db.delete(event)
        db.commit()
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete event")


# =========================================================
# POLLS (Authenticated Create/Vote, MODERATOR+ Approve)
# =========================================================

@router.post("/polls", response_model=PollCreate, status_code=status.HTTP_201_CREATED)
def create_poll(
    poll: PollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new poll (Any authenticated user)"""
    try:
        if len(poll.options) < MIN_OPTIONS_PER_POLL:
            raise HTTPException(status_code=400, detail=f"At least {MIN_OPTIONS_PER_POLL} options required")
        if len(poll.options) > MAX_OPTIONS_PER_POLL:
            raise HTTPException(status_code=400, detail=f"Maximum {MAX_OPTIONS_PER_POLL} options allowed")

        new_poll = Poll(
            poll_uid=generate_poll_uid(),
            question=poll.question,
            options=poll.options,
            votes=[0] * len(poll.options),
            expires_at=poll.expires_at,
            is_approved=False,
            created_by=current_user.user_uid,
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_poll)
        db.commit()
        db.refresh(new_poll)
        return new_poll
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating poll: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create poll")


@router.put("/polls/vote", status_code=status.HTTP_200_OK)
def vote_poll(
    vote: PollVote,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Vote in a poll (Any authenticated user)"""
    try:
        poll = db.query(Poll).filter(Poll.poll_uid == vote.poll_uid).first()
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        if not poll.is_approved:
            raise HTTPException(status_code=400, detail="Poll is not approved yet")
        if poll.expires_at and datetime.now(timezone.utc) > poll.expires_at:
            raise HTTPException(status_code=400, detail="Poll has expired")
        if vote.user_uid in (poll.user_uids_voted or []):
            raise HTTPException(status_code=400, detail="User already voted")
        if vote.option_index >= len(poll.votes):
            raise HTTPException(status_code=400, detail="Invalid option index")

        poll.votes[vote.option_index] += 1
        updated_users = poll.user_uids_voted or []
        updated_users.append(vote.user_uid)
        poll.user_uids_voted = updated_users
        poll.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(poll)
        return {"message": "Vote recorded successfully", "poll_uid": vote.poll_uid}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error voting in poll: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record vote")


@router.get("/polls/active", response_model=dict)
def get_active_polls(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all active polls (Public)"""
    try:
        current_time = datetime.now(timezone.utc)
        query = db.query(Poll).filter(
            Poll.is_approved == True,
            (Poll.expires_at == None) | (Poll.expires_at > current_time)
        )
        total = query.count()
        polls = query.order_by(desc(Poll.created_at)).offset(offset).limit(limit).all()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": polls}
    except Exception as e:
        logger.error(f"Error fetching active polls: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch polls")


@router.get("/polls/{poll_uid}", response_model=PollDetailOut)
def get_poll_details(poll_uid: str, db: Session = Depends(get_db)):
    """Get poll details by UID (Public)"""
    try:
        poll = db.query(Poll).filter(Poll.poll_uid == poll_uid).first()
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        if poll.expires_at and datetime.now(timezone.utc) > poll.expires_at:
            raise HTTPException(status_code=400, detail="Poll has expired")
        return poll
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching poll details: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch poll")


@router.get("/admin/polls/pending", response_model=dict)
def get_pending_polls(
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Get all polls pending approval (MODERATOR, ADMIN)"""
    try:
        polls = db.query(Poll).filter(Poll.is_approved == False).order_by(desc(Poll.created_at)).offset(offset).limit(limit).all()
        total = db.query(Poll).filter(Poll.is_approved == False).count()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": polls}
    except Exception as e:
        logger.error(f"Error fetching pending polls: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending polls")


@router.put("/admin/polls/{poll_id}/approval", status_code=status.HTTP_200_OK)
def approve_poll(
    poll_id: int,
    is_approved: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Approve or reject a poll (MODERATOR, ADMIN)"""
    try:
        poll = db.query(Poll).filter(Poll.id == poll_id).first()
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")

        poll.is_approved = is_approved
        poll.approved_at = datetime.now(timezone.utc) if is_approved else None
        poll.approved_by = current_user.user_uid if is_approved else None
        poll.updated_at = datetime.now(timezone.utc)

        db.commit()
        log_admin_action("APPROVE" if is_approved else "REJECT", "Poll", poll_id,
                         f"Question: {poll.question}", current_user.user_uid)
        return {"message": f"Poll {'approved' if is_approved else 'rejected'} successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving poll: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process poll")


@router.delete("/admin/polls/{poll_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_poll(
    poll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Delete a poll (MODERATOR, ADMIN)"""
    try:
        poll = db.query(Poll).filter(Poll.id == poll_id).first()
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        log_admin_action("DELETE", "Poll", poll_id, f"Question: {poll.question}", current_user.user_uid)
        db.delete(poll)
        db.commit()
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting poll: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete poll")


# =========================================================
# YOUTUBE SHORTS (Admin only)
# =========================================================

@router.post("/news-shorts", response_model=NewsShortCreate, status_code=status.HTTP_201_CREATED)
def create_news_short(
    short: NewsShortCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Create a new YouTube news short (ADMIN only)"""
    try:
        existing = db.query(YouTubeShort).filter(YouTubeShort.video_id == short.video_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Short with this video ID already exists")

        new_short = YouTubeShort(**short.dict(), created_at=datetime.now(timezone.utc))
        db.add(new_short)
        db.commit()
        db.refresh(new_short)
        return new_short
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating news short: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create news short")


@router.get("/news-shorts", response_model=dict)
def get_news_shorts(
    language: str = Query(..., description="Language code like 'en' or 'te'"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get news shorts by language (Public)"""
    try:
        shorts = db.query(YouTubeShort).filter(
            YouTubeShort.language == language
        ).order_by(desc(YouTubeShort.published_at)).offset(offset).limit(limit).all()
        total = db.query(YouTubeShort).filter(YouTubeShort.language == language).count()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": shorts}
    except Exception as e:
        logger.error(f"Error fetching news shorts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch news shorts")


# =========================================================
# STATISTICS (MODERATOR+ for full stats, public for basic)
# =========================================================

@router.get("/stats", summary="Get content statistics")
def get_content_stats(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Get statistics for all content types (authenticated users see more)"""
    try:
        current_time = datetime.now(timezone.utc)
        base_stats = {
            "sponsored_posts": {
                "total": db.query(SponsoredPost).count(),
                "approved": db.query(SponsoredPost).filter(SponsoredPost.is_approved == True).count(),
            },
            "advertisements": {
                "total": db.query(Advertisement).count(),
            },
            "events": {
                "total": db.query(Event).count(),
                "approved": db.query(Event).filter(Event.is_approved == True).count(),
                "upcoming": db.query(Event).filter(Event.is_approved == True, Event.event_date >= current_time.date()).count()
            },
            "polls": {
                "total": db.query(Poll).count(),
                "approved": db.query(Poll).filter(Poll.is_approved == True).count(),
                "active": db.query(Poll).filter(Poll.is_approved == True, (Poll.expires_at == None) | (Poll.expires_at > current_time)).count()
            }
        }
        # For MODERATOR+ add pending counts
        if current_user and current_user.role >= UserRole.MODERATOR:
            base_stats["sponsored_posts"]["pending"] = db.query(SponsoredPost).filter(SponsoredPost.is_approved == False, SponsoredPost.rejected_at == None).count()
            base_stats["advertisements"]["pending"] = db.query(Advertisement).filter(Advertisement.is_approved == False, Advertisement.rejected_at == None).count()
            base_stats["events"]["pending"] = db.query(Event).filter(Event.is_approved == False).count()
            base_stats["polls"]["pending"] = db.query(Poll).filter(Poll.is_approved == False).count()
        return base_stats
    except Exception as e:
        logger.error(f"Error fetching content stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch statistics")


# =========================================================
# CONTENT SCHEDULING (Admin only)
# =========================================================

@router.post("/admin/content/schedule", response_model=ScheduledContentOut, status_code=status.HTTP_201_CREATED)
def schedule_content(
    schedule: ScheduledContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Schedule content for future publishing (ADMIN only)"""
    try:
        content_model = get_content_model(schedule.content_type)
        if not content_model:
            raise HTTPException(status_code=400, detail=f"Invalid content type: {schedule.content_type}")

        content = db.query(content_model).filter(content_model.id == schedule.content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail=f"{schedule.content_type} not found")

        existing = db.query(ContentSchedule).filter(
            ContentSchedule.content_type == schedule.content_type,
            ContentSchedule.content_id == schedule.content_id,
            ContentSchedule.status == "pending"
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Content already scheduled")

        if schedule.scheduled_at <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")

        new_schedule = ContentSchedule(
            content_type=schedule.content_type,
            content_id=schedule.content_id,
            scheduled_at=schedule.scheduled_at,
            scheduled_by=current_user.user_uid,
            status="pending",
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_schedule)
        db.commit()
        db.refresh(new_schedule)
        return new_schedule
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error scheduling content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to schedule content")


@router.get("/admin/content/scheduled", response_model=dict)
def get_scheduled_content(
    status: Optional[str] = Query(None, enum=["pending", "published", "failed"]),
    content_type: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get all scheduled content (ADMIN only)"""
    try:
        query = db.query(ContentSchedule)
        if status:
            query = query.filter(ContentSchedule.status == status)
        if content_type:
            query = query.filter(ContentSchedule.content_type == content_type)
        if from_date:
            query = query.filter(ContentSchedule.scheduled_at >= from_date)
        if to_date:
            query = query.filter(ContentSchedule.scheduled_at <= to_date)

        total = query.count()
        items = query.order_by(ContentSchedule.scheduled_at.asc()).offset(offset).limit(limit).all()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": items}
    except Exception as e:
        logger.error(f"Error fetching scheduled content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch scheduled content")


@router.delete("/admin/content/schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_scheduled_content(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Cancel scheduled content (ADMIN only)"""
    try:
        schedule = db.query(ContentSchedule).filter(ContentSchedule.id == schedule_id).first()
        if not schedule:
            raise HTTPException(status_code=404, detail="Schedule not found")
        if schedule.status != "pending":
            raise HTTPException(status_code=400, detail="Cannot cancel non-pending schedule")
        db.delete(schedule)
        db.commit()
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error canceling schedule: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel schedule")


# =========================================================
# CONTENT FLAGGING (Anyone can flag, MODERATOR+ review)
# =========================================================

@router.post("/{content_type}/{content_id}/flag", response_model=FlaggedContentOut, status_code=status.HTTP_201_CREATED)
def flag_content(
    content_type: str,
    content_id: int,
    flag: FlaggedContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Flag content for review (Any authenticated user)"""
    try:
        existing = db.query(FlaggedContent).filter(
            FlaggedContent.content_type == content_type,
            FlaggedContent.content_id == content_id,
            FlaggedContent.flagged_by == current_user.user_uid,
            FlaggedContent.status == "pending"
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="You already flagged this content")

        new_flag = FlaggedContent(
            content_type=content_type,
            content_id=content_id,
            flagged_by=current_user.user_uid,
            reason=flag.reason,
            status="pending",
            created_at=datetime.now(timezone.utc)
        )
        db.add(new_flag)
        db.commit()
        db.refresh(new_flag)
        return new_flag
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error flagging content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to flag content")


@router.get("/admin/content/flagged", response_model=dict)
def get_flagged_content(
    status: str = Query("pending", enum=["pending", "reviewed", "dismissed"]),
    content_type: Optional[str] = Query(None),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Get flagged content for review (MODERATOR, ADMIN)"""
    try:
        query = db.query(FlaggedContent).filter(FlaggedContent.status == status)
        if content_type:
            query = query.filter(FlaggedContent.content_type == content_type)
        total = query.count()
        items = query.order_by(desc(FlaggedContent.created_at)).offset(offset).limit(limit).all()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": items}
    except Exception as e:
        logger.error(f"Error fetching flagged content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch flagged content")


@router.post("/admin/content/flagged/{flag_id}/review", response_model=FlaggedContentOut)
def review_flagged_content(
    flag_id: int,
    review: FlaggedContentReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Review and take action on flagged content (MODERATOR, ADMIN)"""
    try:
        flag = db.query(FlaggedContent).filter(FlaggedContent.id == flag_id).first()
        if not flag:
            raise HTTPException(status_code=404, detail="Flag not found")

        flag.status = "reviewed" if review.action == "approve" else "dismissed"
        flag.review_notes = review.review_notes
        flag.reviewed_by = current_user.user_uid
        flag.reviewed_at = datetime.now(timezone.utc)

        if review.action == "reject":
            content_model = get_content_model(flag.content_type)
            if content_model:
                content = db.query(content_model).filter(content_model.id == flag.content_id).first()
                if content:
                    if hasattr(content, 'is_approved'):
                        content.is_approved = False
                    elif hasattr(content, 'is_active'):
                        content.is_active = False

        db.commit()
        db.refresh(flag)
        return flag
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error reviewing flagged content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to review flagged content")


# =========================================================
# CONTENT TAGS (Admin create tags, Public view, PUBLISHER+ assign)
# =========================================================

@router.post("/admin/tags", response_model=TagOut, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag: TagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Create a new content tag (ADMIN only)"""
    try:
        existing = db.query(ContentTag).filter(func.lower(ContentTag.name) == func.lower(tag.name)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Tag already exists")
        new_tag = ContentTag(name=tag.name.lower(), created_at=datetime.now(timezone.utc))
        db.add(new_tag)
        db.commit()
        db.refresh(new_tag)
        return new_tag
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating tag: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create tag")


@router.get("/tags", response_model=List[TagOut])
def get_tags(
    search: Optional[str] = Query(None, min_length=2),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get all tags (Public)"""
    try:
        query = db.query(ContentTag)
        if search:
            query = query.filter(ContentTag.name.ilike(f"%{search}%"))
        return query.order_by(desc(ContentTag.usage_count)).limit(limit).all()
    except Exception as e:
        logger.error(f"Error fetching tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tags")


@router.post("/{content_type}/{content_id}/tags", status_code=status.HTTP_200_OK)
def assign_tags(
    content_type: str,
    content_id: int,
    tags_data: ContentTagsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Assign tags to content (PUBLISHER, MODERATOR, ADMIN)"""
    try:
        # Remove existing tags
        db.query(ContentTagMapping).filter(
            ContentTagMapping.content_type == content_type,
            ContentTagMapping.content_id == content_id
        ).delete()

        for tag_name in tags_data.tags:
            tag = db.query(ContentTag).filter(func.lower(ContentTag.name) == func.lower(tag_name)).first()
            if not tag:
                tag = ContentTag(name=tag_name.lower(), created_at=datetime.now(timezone.utc))
                db.add(tag)
                db.flush()
            tag.usage_count += 1
            mapping = ContentTagMapping(content_type=content_type, content_id=content_id, tag_id=tag.id)
            db.add(mapping)

        db.commit()
        return {"message": "Tags assigned successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to assign tags")


@router.get("/tags/{tag_name}/content", response_model=List[TaggedContentOut])
def get_content_by_tag(
    tag_name: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get all content with a specific tag (Public)"""
    try:
        tag = db.query(ContentTag).filter(func.lower(ContentTag.name) == func.lower(tag_name)).first()
        if not tag:
            return []
        mappings = db.query(ContentTagMapping).filter(ContentTagMapping.tag_id == tag.id).limit(limit).all()
        results = []
        for mapping in mappings:
            results.append({
                "id": mapping.id,
                "content_type": mapping.content_type,
                "content_id": mapping.content_id,
                "tag": {"id": tag.id, "name": tag.name}
            })
        return results
    except Exception as e:
        logger.error(f"Error getting content by tag: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content by tag")


# =========================================================
# CONTENT EXPIRY MANAGEMENT (Admin only)
# =========================================================

@router.post("/admin/{content_type}/{content_id}/expire", status_code=status.HTTP_200_OK)
def set_content_expiry(
    content_type: str,
    content_id: int,
    expiry: ContentExpiryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Set expiration date for content (ADMIN only)"""
    try:
        content_model = get_content_model(content_type)
        if not content_model:
            raise HTTPException(status_code=400, detail="Invalid content type")
        content = db.query(content_model).filter(content_model.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="Content not found")

        if hasattr(content, 'expires_at'):
            content.expires_at = expiry.expires_at
        elif hasattr(content, 'end_date'):
            content.end_date = expiry.expires_at

        db.commit()
        return {"message": "Expiry date set successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error setting expiry: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to set expiry date")


@router.get("/admin/content/expiring-soon", response_model=List[ExpiringContentOut])
def get_expiring_content(
    days: int = Query(7, ge=1, le=30),
    content_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get content expiring within specified days (ADMIN only)"""
    try:
        current_time = datetime.now(timezone.utc)
        expiry_threshold = current_time + timedelta(days=days)
        results = []

        if not content_type or content_type == "sponsored_post":
            posts = db.query(SponsoredPost).filter(
                SponsoredPost.end_date.between(current_time, expiry_threshold)
            ).all()
            for post in posts:
                results.append({
                    "content_type": "sponsored_post",
                    "content_id": post.id,
                    "title": post.title,
                    "expires_at": post.end_date,
                    "days_until_expiry": (post.end_date - current_time).days
                })

        if not content_type or content_type == "advertisement":
            ads = db.query(Advertisement).filter(
                Advertisement.end_date.between(current_time, expiry_threshold)
            ).all()
            for ad in ads:
                results.append({
                    "content_type": "advertisement",
                    "content_id": ad.id,
                    "title": ad.title,
                    "expires_at": ad.end_date,
                    "days_until_expiry": (ad.end_date - current_time).days
                })

        if not content_type or content_type == "poll":
            polls = db.query(Poll).filter(
                Poll.expires_at.isnot(None),
                Poll.expires_at.between(current_time, expiry_threshold)
            ).all()
            for poll in polls:
                results.append({
                    "content_type": "poll",
                    "content_id": poll.id,
                    "title": poll.question[:50],
                    "expires_at": poll.expires_at,
                    "days_until_expiry": (poll.expires_at - current_time).days
                })

        return sorted(results, key=lambda x: x['days_until_expiry'])
    except Exception as e:
        logger.error(f"Error fetching expiring content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch expiring content")


# =========================================================
# CONTENT ANALYTICS (Admin only for overview, public for individual)
# =========================================================

@router.get("/analytics/{content_type}/{content_id}", response_model=ContentAnalyticsOut)
def get_content_analytics(
    content_type: str,
    content_id: int,
    period_days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Get analytics for specific content (PUBLISHER+ for own content, MODERATOR+ for any)"""
    # Simplified: return mock structure; in real app, query analytics table.
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=period_days)
    return {
        "content_type": content_type,
        "content_id": content_id,
        "views": 0,
        "clicks": 0,
        "engagement_rate": 0.0,
        "total_interactions": 0,
        "period_start": start_date,
        "period_end": end_date,
        "daily_breakdown": []
    }


@router.get("/admin/analytics/overview", response_model=ContentAnalyticsOverviewOut)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get overview of content analytics (ADMIN only)"""
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=7)
    month_start = today - timedelta(days=30)

    return {
        "total_content": {
            "sponsored_posts": db.query(SponsoredPost).count(),
            "advertisements": db.query(Advertisement).count(),
            "events": db.query(Event).count(),
            "polls": db.query(Poll).count()
        },
        "published_today": {
            "sponsored_posts": db.query(SponsoredPost).filter(func.date(SponsoredPost.created_at) == today).count(),
            "advertisements": db.query(Advertisement).filter(func.date(Advertisement.created_at) == today).count(),
            "events": db.query(Event).filter(func.date(Event.created_at) == today).count(),
            "polls": db.query(Poll).filter(func.date(Poll.created_at) == today).count()
        },
        "published_this_week": {
            "sponsored_posts": db.query(SponsoredPost).filter(SponsoredPost.created_at >= week_start).count(),
            "advertisements": db.query(Advertisement).filter(Advertisement.created_at >= week_start).count(),
            "events": db.query(Event).filter(Event.created_at >= week_start).count(),
            "polls": db.query(Poll).filter(Poll.created_at >= week_start).count()
        },
        "published_this_month": {
            "sponsored_posts": db.query(SponsoredPost).filter(SponsoredPost.created_at >= month_start).count(),
            "advertisements": db.query(Advertisement).filter(Advertisement.created_at >= month_start).count(),
            "events": db.query(Event).filter(Event.created_at >= month_start).count(),
            "polls": db.query(Poll).filter(Poll.created_at >= month_start).count()
        },
        "pending_approval": {
            "sponsored_posts": db.query(SponsoredPost).filter(SponsoredPost.is_approved == False).count(),
            "events": db.query(Event).filter(Event.is_approved == False).count(),
            "polls": db.query(Poll).filter(Poll.is_approved == False).count()
        },
        "top_performing": [],
        "engagement_trends": {}
    }


# =========================================================
# BULK OPERATIONS (Admin only)
# =========================================================

@router.post("/admin/bulk/approve", response_model=BulkOperationResponse)
def bulk_approve_content(
    operation: BulkOperation,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Bulk approve sponsored posts (ADMIN only)"""
    results = {"total": len(operation.content_ids), "successful": 0, "failed": 0, "errors": []}
    for content_id in operation.content_ids:
        try:
            content = db.query(SponsoredPost).filter(SponsoredPost.id == content_id).first()
            if content:
                content.is_approved = True
                results["successful"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"id": content_id, "error": "Content not found"})
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"id": content_id, "error": str(e)})
    db.commit()
    return results


@router.post("/admin/bulk/delete", response_model=BulkOperationResponse)
def bulk_delete_content(
    operation: BulkOperation,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Bulk delete content (ADMIN only)"""
    results = {"total": len(operation.content_ids), "successful": 0, "failed": 0, "errors": []}
    for content_id in operation.content_ids:
        try:
            content = db.query(SponsoredPost).filter(SponsoredPost.id == content_id).first()
            if not content:
                content = db.query(Advertisement).filter(Advertisement.id == content_id).first()
            if not content:
                content = db.query(Event).filter(Event.id == content_id).first()
            if not content:
                content = db.query(Poll).filter(Poll.id == content_id).first()
            if content:
                db.delete(content)
                results["successful"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({"id": content_id, "error": "Content not found"})
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"id": content_id, "error": str(e)})
    db.commit()
    return results


# =========================================================
# CONTENT SEARCH (Public)
# =========================================================

@router.get("/search", response_model=ContentSearchResults)
def search_content(
    query: str = Query(..., min_length=2),
    content_type: Optional[str] = Query(None, enum=["sponsored", "advertisement", "event", "poll"]),
    status: Optional[str] = Query(None, enum=["approved", "pending"]),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Search across all content types (Public)"""
    try:
        results = []
        if not content_type or content_type == "sponsored":
            sponsored = db.query(SponsoredPost).filter(
                or_(SponsoredPost.title.ilike(f"%{query}%"), SponsoredPost.content.ilike(f"%{query}%"))
            )
            if status == "approved":
                sponsored = sponsored.filter(SponsoredPost.is_approved == True)
            elif status == "pending":
                sponsored = sponsored.filter(SponsoredPost.is_approved == False)
            for item in sponsored.limit(limit).all():
                results.append({
                    "type": "sponsored_post",
                    "id": item.id,
                    "title": item.title,
                    "created_at": item.created_at,
                    "is_approved": item.is_approved
                })

        if not content_type or content_type == "event":
            events = db.query(Event).filter(
                or_(Event.title.ilike(f"%{query}%"), Event.description.ilike(f"%{query}%"), Event.location.ilike(f"%{query}%"))
            )
            if status == "approved":
                events = events.filter(Event.is_approved == True)
            elif status == "pending":
                events = events.filter(Event.is_approved == False)
            for item in events.limit(limit).all():
                results.append({
                    "type": "event",
                    "id": item.id,
                    "title": item.title,
                    "created_at": item.created_at,
                    "is_approved": item.is_approved
                })

        total = len(results)
        results = results[offset:offset + limit]
        return {
            "total": total,
            "items": results,
            "page": offset // limit + 1 if limit > 0 else 1,
            "limit": limit,
            "has_next": len(results) == limit,
            "has_previous": offset > 0
        }
    except Exception as e:
        logger.error(f"Error searching content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to search content")


# =========================================================
# ADVERTISEMENTS (PUBLISHER+ Create, ADMIN only for full management)
# =========================================================

@router.post("/advertisements", response_model=AdvertisementOut, status_code=status.HTTP_201_CREATED)
def create_advertisement(
    ad: AdvertisementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Create a new advertisement (PUBLISHER, MODERATOR, ADMIN)"""
    try:
        validate_dates(ad.start_date, ad.end_date)
        validate_location_ids(ad.state_id, ad.district_id, ad.city_id, db)
        validate_language_id(ad.language_id, db)

        is_approved = current_user.role == UserRole.ADMIN

        ad_data = {
            "title": ad.title, "image_url": ad.image_url, "redirect_url": ad.redirect_url,
            "placement": ad.placement, "start_date": ad.start_date, "end_date": ad.end_date,
            "state_id": ad.state_id, "district_id": ad.district_id, "city_id": ad.city_id,
            "language_id": ad.language_id, "is_active": ad.is_active, "is_approved": is_approved,
            "is_premium": ad.is_premium, "premium_priority": ad.premium_priority,
            "created_by": current_user.user_uid, "created_at": datetime.now(timezone.utc)
        }
        if ad.targeting:
            if ad.targeting.gender: ad_data["target_gender"] = ad.targeting.gender
            if ad.targeting.age_min: ad_data["target_age_min"] = ad.targeting.age_min
            if ad.targeting.age_max: ad_data["target_age_max"] = ad.targeting.age_max

        new_ad = Advertisement(**ad_data)
        db.add(new_ad)
        db.commit()
        db.refresh(new_ad)
        log_admin_action("CREATE", "Advertisement", new_ad.id, f"Title: {ad.title}", current_user.user_uid)
        return new_ad
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating advertisement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create advertisement")


@router.get("/advertisements/active", response_model=dict)
def get_active_advertisements(
    user_uid: Optional[str] = Query(None),
    placement: str = Query("feed"),
    limit: int = Query(10, ge=1, le=50),
    session_id: Optional[str] = Query(None),
    include_premium: bool = Query(True),
    premium_limit: int = Query(1, ge=0, le=3),
    exclude_seen: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get active advertisements with targeting (Public)"""
    try:
        current_time = datetime.now(timezone.utc)
        query = db.query(Advertisement).filter(
            Advertisement.is_active == True,
            Advertisement.is_approved == True,
            Advertisement.start_date <= current_time,
            Advertisement.end_date >= current_time
        )
        if placement:
            query = query.filter(Advertisement.placement == placement)

        user_pref = get_user_preferences(user_uid, db) if user_uid else None

        seen_ids = set()
        if exclude_seen and session_id:
            try:
                seen_ads = db.query(AdImpression.ad_id).filter(AdImpression.session_id == session_id).all()
                seen_ids = {ad[0] for ad in seen_ads}
            except Exception:
                pass

        results = []

        # Premium
        if include_premium:
            premium_ads = query.filter(Advertisement.is_premium == True).order_by(
                desc(Advertisement.premium_priority), desc(Advertisement.created_at)
            ).all()
            for ad in premium_ads[:premium_limit]:
                if ad.id not in seen_ids:
                    ad.priority = "premium"
                    results.append(ad)
                    seen_ids.add(ad.id)

        # City targeting
        if len(results) < limit and user_pref and user_pref.city_id:
            city_ads = query.filter(Advertisement.city_id == user_pref.city_id, Advertisement.is_premium == False)
            for ad in city_ads.all():
                if ad.id not in seen_ids and len(results) < limit:
                    ad.priority = "city"
                    results.append(ad)
                    seen_ids.add(ad.id)

        # District targeting
        if len(results) < limit and user_pref and user_pref.district_id:
            district_ads = query.filter(Advertisement.district_id == user_pref.district_id, Advertisement.city_id == None)
            for ad in district_ads.all():
                if ad.id not in seen_ids and len(results) < limit:
                    ad.priority = "district"
                    results.append(ad)
                    seen_ids.add(ad.id)

        # State targeting
        if len(results) < limit and user_pref and user_pref.state_id:
            state_ads = query.filter(Advertisement.state_id == user_pref.state_id, Advertisement.city_id == None, Advertisement.district_id == None)
            for ad in state_ads.all():
                if ad.id not in seen_ids and len(results) < limit:
                    ad.priority = "state"
                    results.append(ad)
                    seen_ids.add(ad.id)

        # Language targeting
        if len(results) < limit and user_pref and user_pref.language_id:
            lang_ads = query.filter(Advertisement.language_id == user_pref.language_id, Advertisement.state_id == None, Advertisement.district_id == None, Advertisement.city_id == None)
            for ad in lang_ads.all():
                if ad.id not in seen_ids and len(results) < limit:
                    ad.priority = "language"
                    results.append(ad)
                    seen_ids.add(ad.id)

        # National
        if len(results) < limit:
            national_ads = query.filter(Advertisement.state_id == None, Advertisement.district_id == None, Advertisement.city_id == None, Advertisement.is_premium == False)
            for ad in national_ads.all():
                if ad.id not in seen_ids and len(results) < limit:
                    ad.priority = "national"
                    results.append(ad)
                    seen_ids.add(ad.id)

        # Log impressions
        for ad in results:
            try:
                impression = AdImpression(ad_id=ad.id, user_uid=user_uid, session_id=session_id, impression_at=datetime.now(timezone.utc))
                db.add(impression)
            except Exception:
                pass
        db.commit()

        return {
            "ads": results,
            "metadata": {
                "total_available": len(results),
                "returned": len(results),
                "priority_breakdown": {
                    "premium": len([a for a in results if getattr(a, 'priority', None) == "premium"]),
                    "city": len([a for a in results if getattr(a, 'priority', None) == "city"]),
                    "district": len([a for a in results if getattr(a, 'priority', None) == "district"]),
                    "state": len([a for a in results if getattr(a, 'priority', None) == "state"]),
                    "language": len([a for a in results if getattr(a, 'priority', None) == "language"]),
                    "national": len([a for a in results if getattr(a, 'priority', None) == "national"])
                }
            }
        }
    except Exception as e:
        logger.error(f"Error fetching active ads: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch advertisements")


@router.get("/admin/advertisements", response_model=PaginatedAdvertisementsOut)
def get_all_advertisements(
    is_approved: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get all advertisements with pagination (ADMIN only)"""
    try:
        query = db.query(Advertisement)
        if is_approved is not None:
            query = query.filter(Advertisement.is_approved == is_approved)
        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(desc(Advertisement.created_at)).offset(offset).limit(limit).all()
        return PaginatedAdvertisementsOut(total=total, page=page, limit=limit, items=items)
    except Exception as e:
        logger.error(f"Error fetching advertisements: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch advertisements")


@router.put("/admin/advertisements/{ad_id}/moderate", response_model=dict)
def moderate_advertisement(
    ad_id: int,
    action: str = Query(..., enum=["approve", "reject"]),
    reason: Optional[str] = Query(None, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Moderate an advertisement (ADMIN only)"""
    try:
        ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Advertisement not found")

        if action == "approve":
            if ad.is_approved:
                raise HTTPException(status_code=400, detail="Already approved")
            ad.is_approved = True
            ad.is_active = True
            ad.approved_at = datetime.now(timezone.utc)
            ad.approved_by = current_user.user_uid
            message = "Approved"
        else:
            if not reason:
                raise HTTPException(status_code=400, detail="Rejection reason required")
            ad.is_approved = False
            ad.is_active = False
            ad.rejected_at = datetime.now(timezone.utc)
            ad.rejected_by = current_user.user_uid
            ad.rejection_reason = reason
            message = "Rejected"

        ad.updated_at = datetime.now(timezone.utc)
        db.commit()
        log_admin_action(action.upper(), "Advertisement", ad_id, f"Title: {ad.title}", current_user.user_uid)
        return {"message": f"Advertisement {ad_id} {message}", "ad_id": ad_id, "action": action}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error moderating advertisement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to moderate advertisement")


@router.delete("/admin/advertisements/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_advertisement(
    ad_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Delete advertisement (ADMIN only)"""
    try:
        ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Advertisement not found")
        log_admin_action("DELETE", "Advertisement", ad_id, f"Title: {ad.title}", current_user.user_uid)
        db.delete(ad)
        db.commit()
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting advertisement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete advertisement")


# =========================================================
# SPONSORED POSTS (PUBLISHER+ Create, ADMIN only for full management)
# =========================================================

@router.post("/sponsored-posts", response_model=SponsoredPostOut, status_code=status.HTTP_201_CREATED)
def create_sponsored_post(
    post: SponsoredPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.PUBLISHER, UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Create a new sponsored post (PUBLISHER, MODERATOR, ADMIN)"""
    try:
        validate_dates(post.start_date, post.end_date)
        validate_location_ids(post.state_id, post.district_id, post.city_id, db)
        validate_language_id(post.language_id, db)

        is_approved = current_user.role == UserRole.ADMIN

        post_data = {
            "title": post.title, "content": post.content, "image_url": post.image_url,
            "cta_text": post.cta_text, "cta_url": post.cta_url,
            "start_date": post.start_date, "end_date": post.end_date,
            "state_id": post.state_id, "district_id": post.district_id, "city_id": post.city_id,
            "language_id": post.language_id, "is_approved": is_approved,
            "created_by": current_user.user_uid, "created_at": datetime.now(timezone.utc)
        }
        if post.targeting:
            if post.targeting.gender: post_data["target_gender"] = post.targeting.gender
            if post.targeting.age_min: post_data["target_age_min"] = post.targeting.age_min
            if post.targeting.age_max: post_data["target_age_max"] = post.targeting.age_max

        new_post = SponsoredPost(**post_data)
        db.add(new_post)
        db.commit()
        db.refresh(new_post)
        log_admin_action("CREATE", "SponsoredPost", new_post.id, f"Title: {post.title}", current_user.user_uid)
        return new_post
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating sponsored post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create sponsored post")


@router.get("/sponsored-posts/active", response_model=dict)
def get_active_sponsored_posts(
    user_uid: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    session_id: Optional[str] = Query(None),
    exclude_seen: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get active sponsored posts with targeting (Public)"""
    try:
        current_time = datetime.now(timezone.utc)
        query = db.query(SponsoredPost).filter(
            SponsoredPost.is_approved == True,
            SponsoredPost.start_date <= current_time,
            SponsoredPost.end_date >= current_time
        )

        user_pref = get_user_preferences(user_uid, db) if user_uid else None

        seen_ids = set()
        if exclude_seen and session_id:
            try:
                seen_posts = db.query(SponsoredImpression.post_id).filter(
                    SponsoredImpression.session_id == session_id
                ).all()
                seen_ids = {post[0] for post in seen_posts}
            except Exception:
                pass

        results = []

        # City
        if user_pref and user_pref.city_id:
            city_posts = query.filter(SponsoredPost.city_id == user_pref.city_id)
            for post in city_posts.all():
                if post.id not in seen_ids and len(results) < limit:
                    post.priority = "city"
                    results.append(post)
                    seen_ids.add(post.id)

        # District
        if len(results) < limit and user_pref and user_pref.district_id:
            district_posts = query.filter(SponsoredPost.district_id == user_pref.district_id, SponsoredPost.city_id == None)
            for post in district_posts.all():
                if post.id not in seen_ids and len(results) < limit:
                    post.priority = "district"
                    results.append(post)
                    seen_ids.add(post.id)

        # State
        if len(results) < limit and user_pref and user_pref.state_id:
            state_posts = query.filter(SponsoredPost.state_id == user_pref.state_id, SponsoredPost.city_id == None, SponsoredPost.district_id == None)
            for post in state_posts.all():
                if post.id not in seen_ids and len(results) < limit:
                    post.priority = "state"
                    results.append(post)
                    seen_ids.add(post.id)

        # Language
        if len(results) < limit and user_pref and user_pref.language_id:
            lang_posts = query.filter(SponsoredPost.language_id == user_pref.language_id,
                                      SponsoredPost.state_id == None, SponsoredPost.district_id == None, SponsoredPost.city_id == None)
            for post in lang_posts.all():
                if post.id not in seen_ids and len(results) < limit:
                    post.priority = "language"
                    results.append(post)
                    seen_ids.add(post.id)

        # National
        if len(results) < limit:
            national_posts = query.filter(SponsoredPost.state_id == None, SponsoredPost.district_id == None, SponsoredPost.city_id == None)
            for post in national_posts.all():
                if post.id not in seen_ids and len(results) < limit:
                    post.priority = "national"
                    results.append(post)
                    seen_ids.add(post.id)

        # Log impressions
        for post in results:
            try:
                impression = SponsoredImpression(post_id=post.id, user_uid=user_uid, session_id=session_id, impression_at=datetime.now(timezone.utc))
                db.add(impression)
            except Exception:
                pass
        db.commit()

        return {
            "posts": results,
            "metadata": {
                "total_available": len(results),
                "returned": len(results),
                "priority_breakdown": {
                    "city": len([p for p in results if getattr(p, 'priority', None) == "city"]),
                    "district": len([p for p in results if getattr(p, 'priority', None) == "district"]),
                    "state": len([p for p in results if getattr(p, 'priority', None) == "state"]),
                    "language": len([p for p in results if getattr(p, 'priority', None) == "language"]),
                    "national": len([p for p in results if getattr(p, 'priority', None) == "national"])
                }
            }
        }
    except Exception as e:
        logger.error(f"Error fetching active sponsored posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch sponsored posts")


@router.get("/admin/sponsored-posts", response_model=PaginatedSponsoredPostsOut)
def get_all_sponsored_posts(
    is_approved: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get all sponsored posts with pagination (ADMIN only)"""
    try:
        query = db.query(SponsoredPost)
        if is_approved is not None:
            query = query.filter(SponsoredPost.is_approved == is_approved)
        total = query.count()
        offset = (page - 1) * limit
        items = query.order_by(desc(SponsoredPost.created_at)).offset(offset).limit(limit).all()
        return PaginatedSponsoredPostsOut(total=total, page=page, limit=limit, items=items)
    except Exception as e:
        logger.error(f"Error fetching sponsored posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch sponsored posts")


@router.put("/admin/sponsored-posts/{post_id}/moderate", response_model=dict)
def moderate_sponsored_post(
    post_id: int,
    action: str = Query(..., enum=["approve", "reject"]),
    reason: Optional[str] = Query(None, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Moderate a sponsored post (ADMIN only)"""
    try:
        post = db.query(SponsoredPost).filter(SponsoredPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Sponsored post not found")

        if action == "approve":
            if post.is_approved:
                raise HTTPException(status_code=400, detail="Already approved")
            post.is_approved = True
            post.approved_at = datetime.now(timezone.utc)
            post.approved_by = current_user.user_uid
            message = "Approved"
        else:
            if not reason:
                raise HTTPException(status_code=400, detail="Rejection reason required")
            post.is_approved = False
            post.rejected_at = datetime.now(timezone.utc)
            post.rejected_by = current_user.user_uid
            post.rejection_reason = reason
            message = "Rejected"

        post.updated_at = datetime.now(timezone.utc)
        db.commit()
        log_admin_action(action.upper(), "SponsoredPost", post_id, f"Title: {post.title}", current_user.user_uid)
        return {"message": f"Sponsored post {post_id} {message}", "post_id": post_id, "action": action}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error moderating sponsored post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to moderate sponsored post")


@router.delete("/admin/sponsored-posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sponsored_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Delete sponsored post (ADMIN only)"""
    try:
        post = db.query(SponsoredPost).filter(SponsoredPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Sponsored post not found")
        log_admin_action("DELETE", "SponsoredPost", post_id, f"Title: {post.title}", current_user.user_uid)
        db.delete(post)
        db.commit()
        return None
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting sponsored post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete sponsored post")


# =========================================================
# ADMIN DASHBOARD OVERVIEW & TARGETING OPTIONS
# =========================================================

@router.get("/targeting-options")
def get_targeting_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get targeting options for ads (ADMIN only)"""
    languages = db.query(Language).all()
    states = db.query(State).all()
    states_with_districts = []
    for state in states:
        districts = db.query(District).filter(District.state_id == state.id).all()
        states_with_districts.append({
            "id": state.id,
            "name": state.name,
            "districts": [{"id": d.id, "name": d.name} for d in districts]
        })
    return {
        "languages": [{"id": l.id, "name": l.name, "code": l.code} for l in languages],
        "states": states_with_districts,
        "genders": ["male", "female", "all"],
        "age_ranges": ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"]
    }


@router.get("/overview", response_model=dict)
def get_admin_dashboard_overview(
    period: str = Query("week", enum=["day", "week", "month", "year"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Comprehensive admin dashboard overview (ADMIN only)"""
    current_time = datetime.now(timezone.utc)
    if period == "day":
        start_date = current_time - timedelta(days=1)
    elif period == "week":
        start_date = current_time - timedelta(days=7)
    elif period == "month":
        start_date = current_time - timedelta(days=30)
    else:
        start_date = current_time - timedelta(days=365)

    # Advertisements
    ads_total = db.query(Advertisement).count()
    ads_pending = db.query(Advertisement).filter(Advertisement.is_approved == False, Advertisement.rejected_at == None).count()
    ads_approved = db.query(Advertisement).filter(Advertisement.is_approved == True).count()
    ads_active = db.query(Advertisement).filter(
        Advertisement.is_approved == True, Advertisement.is_active == True,
        Advertisement.start_date <= current_time, Advertisement.end_date >= current_time
    ).count()
    ads_new = db.query(Advertisement).filter(Advertisement.created_at >= start_date).count()

    # Sponsored posts
    posts_total = db.query(SponsoredPost).count()
    posts_pending = db.query(SponsoredPost).filter(SponsoredPost.is_approved == False, SponsoredPost.rejected_at == None).count()
    posts_approved = db.query(SponsoredPost).filter(SponsoredPost.is_approved == True).count()
    posts_active = db.query(SponsoredPost).filter(
        SponsoredPost.is_approved == True,
        SponsoredPost.start_date <= current_time,
        SponsoredPost.end_date >= current_time
    ).count()
    posts_new = db.query(SponsoredPost).filter(SponsoredPost.created_at >= start_date).count()

    # Events
    events_total = db.query(Event).count()
    events_pending = db.query(Event).filter(Event.is_approved == False).count()
    events_approved = db.query(Event).filter(Event.is_approved == True).count()
    events_upcoming = db.query(Event).filter(Event.is_approved == True, Event.event_date >= current_time.date()).count()
    events_new = db.query(Event).filter(Event.created_at >= start_date).count()

    # Polls
    polls_total = db.query(Poll).count()
    polls_pending = db.query(Poll).filter(Poll.is_approved == False).count()
    polls_approved = db.query(Poll).filter(Poll.is_approved == True).count()
    polls_active = db.query(Poll).filter(
        Poll.is_approved == True,
        (Poll.expires_at == None) | (Poll.expires_at > current_time)
    ).count()
    polls_new = db.query(Poll).filter(Poll.created_at >= start_date).count()

    return {
        "period": period,
        "period_start": start_date.isoformat(),
        "period_end": current_time.isoformat(),
        "advertisements": {
            "total": ads_total, "pending": ads_pending, "approved": ads_approved,
            "active": ads_active, "new_in_period": ads_new
        },
        "sponsored_posts": {
            "total": posts_total, "pending": posts_pending, "approved": posts_approved,
            "active": posts_active, "new_in_period": posts_new
        },
        "events": {
            "total": events_total, "pending": events_pending, "approved": events_approved,
            "upcoming": events_upcoming, "new_in_period": events_new
        },
        "polls": {
            "total": polls_total, "pending": polls_pending, "approved": polls_approved,
            "active": polls_active, "new_in_period": polls_new
        }
    }


# =========================================================
# DETAILED ANALYTICS (Admin only)
# =========================================================

@router.get("/advertisements/analytics", response_model=dict)
def get_advertisements_analytics(
    period: str = Query("month", enum=["week", "month", "year"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    current_time = datetime.now(timezone.utc)
    start_date = current_time - timedelta(days=7) if period == "week" else current_time - timedelta(days=30) if period == "month" else current_time - timedelta(days=365)
    daily_breakdown = []
    days = (current_time - start_date).days
    for i in range(days):
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        daily_breakdown.append({
            "date": day_start.date().isoformat(),
            "created": db.query(Advertisement).filter(Advertisement.created_at >= day_start, Advertisement.created_at < day_end).count(),
            "approved": db.query(Advertisement).filter(Advertisement.approved_at >= day_start, Advertisement.approved_at < day_end).count(),
            "rejected": db.query(Advertisement).filter(Advertisement.rejected_at >= day_start, Advertisement.rejected_at < day_end).count()
        })
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": current_time.isoformat(),
        "daily_breakdown": daily_breakdown,
        "summary": {
            "total_created": db.query(Advertisement).filter(Advertisement.created_at >= start_date).count(),
            "total_approved": db.query(Advertisement).filter(Advertisement.approved_at >= start_date).count(),
            "total_rejected": db.query(Advertisement).filter(Advertisement.rejected_at >= start_date).count()
        }
    }


@router.get("/sponsored-posts/analytics", response_model=dict)
def get_sponsored_posts_analytics(
    period: str = Query("month", enum=["week", "month", "year"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    current_time = datetime.now(timezone.utc)
    start_date = current_time - timedelta(days=7) if period == "week" else current_time - timedelta(days=30) if period == "month" else current_time - timedelta(days=365)
    daily_breakdown = []
    days = (current_time - start_date).days
    for i in range(days):
        day_start = start_date + timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        daily_breakdown.append({
            "date": day_start.date().isoformat(),
            "created": db.query(SponsoredPost).filter(SponsoredPost.created_at >= day_start, SponsoredPost.created_at < day_end).count(),
            "approved": db.query(SponsoredPost).filter(SponsoredPost.approved_at >= day_start, SponsoredPost.approved_at < day_end).count()
        })
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": current_time.isoformat(),
        "daily_breakdown": daily_breakdown,
        "summary": {
            "total_created": db.query(SponsoredPost).filter(SponsoredPost.created_at >= start_date).count(),
            "total_approved": db.query(SponsoredPost).filter(SponsoredPost.approved_at >= start_date).count(),
            "pending": db.query(SponsoredPost).filter(SponsoredPost.is_approved == False, SponsoredPost.rejected_at == None).count()
        }
    }


@router.get("/events/analytics", response_model=dict)
def get_events_analytics(
    period: str = Query("month", enum=["week", "month", "year"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    current_time = datetime.now(timezone.utc)
    start_date = current_time - timedelta(days=7) if period == "week" else current_time - timedelta(days=30) if period == "month" else current_time - timedelta(days=365)
    upcoming_events = db.query(Event).filter(Event.is_approved == True, Event.event_date >= current_time.date()).count()
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": current_time.isoformat(),
        "total_events": db.query(Event).filter(Event.created_at >= start_date).count(),
        "approved_events": db.query(Event).filter(Event.is_approved == True, Event.created_at >= start_date).count(),
        "upcoming_events": upcoming_events
    }


@router.get("/polls/analytics", response_model=dict)
def get_polls_analytics(
    period: str = Query("month", enum=["week", "month", "year"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    current_time = datetime.now(timezone.utc)
    start_date = current_time - timedelta(days=7) if period == "week" else current_time - timedelta(days=30) if period == "month" else current_time - timedelta(days=365)
    polls = db.query(Poll).filter(Poll.created_at >= start_date).all()
    total_votes = sum(sum(p.votes) if p.votes else 0 for p in polls)
    return {
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": current_time.isoformat(),
        "total_polls": len(polls),
        "approved_polls": db.query(Poll).filter(Poll.is_approved == True, Poll.created_at >= start_date).count(),
        "active_polls": db.query(Poll).filter(Poll.is_approved == True, (Poll.expires_at == None) | (Poll.expires_at > current_time)).count(),
        "total_votes": total_votes,
        "avg_votes_per_poll": round(total_votes / len(polls), 2) if len(polls) > 0 else 0
    }


@router.get("/quick-stats", response_model=dict)
def get_quick_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Quick statistics for dashboard widgets (ADMIN only)"""
    current_time = datetime.now(timezone.utc)
    today_start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    return {
        "today": {
            "ads_created": db.query(Advertisement).filter(Advertisement.created_at >= today_start).count(),
            "posts_created": db.query(SponsoredPost).filter(SponsoredPost.created_at >= today_start).count(),
            "events_created": db.query(Event).filter(Event.created_at >= today_start).count(),
            "polls_created": db.query(Poll).filter(Poll.created_at >= today_start).count(),
        },
        "pending": {
            "ads": db.query(Advertisement).filter(Advertisement.is_approved == False, Advertisement.rejected_at == None).count(),
            "posts": db.query(SponsoredPost).filter(SponsoredPost.is_approved == False, SponsoredPost.rejected_at == None).count(),
            "events": db.query(Event).filter(Event.is_approved == False).count(),
            "polls": db.query(Poll).filter(Poll.is_approved == False).count(),
        },
        "total": {
            "ads": db.query(Advertisement).count(),
            "posts": db.query(SponsoredPost).count(),
            "events": db.query(Event).count(),
            "polls": db.query(Poll).count(),
        }
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@router.get("/health", tags=["Health"])
def content_health_check(db: Session = Depends(get_db)):
    """Health check endpoint for content service (Public)"""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "content_router",
            "database": "connected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")
    
# =========================================================
# MISSING UPDATE ENDPOINTS
# =========================================================

@router.put("/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Update event details (MODERATOR, ADMIN)"""
    try:
        db_event = db.query(Event).filter(Event.id == event_id).first()
        if not db_event:
            raise HTTPException(status_code=404, detail="Event not found")

        for key, value in event.dict().items():
            setattr(db_event, key, value)

        db_event.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_event)
        return db_event
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating event: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update event")


@router.put("/polls/{poll_id}", response_model=PollCreate)
def update_poll(
    poll_id: int,
    poll: PollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.ADMIN]))
):
    """Update poll details (MODERATOR, ADMIN)"""
    try:
        db_poll = db.query(Poll).filter(Poll.id == poll_id).first()
        if not db_poll:
            raise HTTPException(status_code=404, detail="Poll not found")

        if len(poll.options) < MIN_OPTIONS_PER_POLL:
            raise HTTPException(status_code=400, detail=f"At least {MIN_OPTIONS_PER_POLL} options required")

        db_poll.question = poll.question
        db_poll.options = poll.options
        db_poll.votes = [0] * len(poll.options)
        db_poll.expires_at = poll.expires_at
        db_poll.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(db_poll)
        return db_poll
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating poll: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update poll")


@router.put("/advertisements/{ad_id}", response_model=AdvertisementOut)
def update_advertisement(
    ad_id: int,
    ad_update: AdvertisementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update advertisement (ADMIN only)"""
    try:
        ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Advertisement not found")

        # Update basic fields
        if ad_update.title is not None:
            ad.title = ad_update.title
        if ad_update.image_url is not None:
            ad.image_url = ad_update.image_url
        if ad_update.redirect_url is not None:
            ad.redirect_url = ad_update.redirect_url
        if ad_update.placement is not None:
            ad.placement = ad_update.placement
        if ad_update.start_date is not None:
            ad.start_date = ad_update.start_date
        if ad_update.end_date is not None:
            ad.end_date = ad_update.end_date
        if ad_update.state_id is not None:
            ad.state_id = ad_update.state_id
        if ad_update.district_id is not None:
            ad.district_id = ad_update.district_id
        if ad_update.city_id is not None:
            ad.city_id = ad_update.city_id
        if ad_update.language_id is not None:
            ad.language_id = ad_update.language_id
        if ad_update.is_active is not None:
            ad.is_active = ad_update.is_active

        # Update targeting fields
        if ad_update.targeting:
            if ad_update.targeting.gender is not None:
                ad.target_gender = ad_update.targeting.gender
            if ad_update.targeting.age_min is not None:
                ad.target_age_min = ad_update.targeting.age_min
            if ad_update.targeting.age_max is not None:
                ad.target_age_max = ad_update.targeting.age_max
            if ad_update.targeting.languages and not ad_update.language_id:
                ad.language_id = ad_update.targeting.languages[0]

        ad.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(ad)
        return ad
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating advertisement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update advertisement")


@router.put("/sponsored-posts/{post_id}", response_model=SponsoredPostOut)
def update_sponsored_post(
    post_id: int,
    post_update: SponsoredPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Update sponsored post (ADMIN only)"""
    try:
        post = db.query(SponsoredPost).filter(SponsoredPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Sponsored post not found")

        if post_update.start_date and post_update.end_date:
            validate_dates(post_update.start_date, post_update.end_date)

        # Update fields
        if post_update.title is not None:
            post.title = post_update.title
        if post_update.content is not None:
            post.content = post_update.content
        if post_update.image_url is not None:
            post.image_url = post_update.image_url
        if post_update.cta_text is not None:
            post.cta_text = post_update.cta_text
        if post_update.cta_url is not None:
            post.cta_url = post_update.cta_url
        if post_update.start_date is not None:
            post.start_date = post_update.start_date
        if post_update.end_date is not None:
            post.end_date = post_update.end_date
        if post_update.state_id is not None:
            post.state_id = post_update.state_id
        if post_update.district_id is not None:
            post.district_id = post_update.district_id
        if post_update.city_id is not None:
            post.city_id = post_update.city_id
        if post_update.language_id is not None:
            post.language_id = post_update.language_id

        if post_update.targeting:
            if post_update.targeting.gender is not None:
                post.target_gender = post_update.targeting.gender
            if post_update.targeting.age_min is not None:
                post.target_age_min = post_update.targeting.age_min
            if post_update.targeting.age_max is not None:
                post.target_age_max = post_update.targeting.age_max

        post.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(post)
        return post
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating sponsored post: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update sponsored post")


@router.post("/advertisements/{ad_id}/toggle-status", response_model=dict)
def toggle_ad_status(
    ad_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Toggle advertisement active status (ADMIN only)"""
    try:
        ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Advertisement not found")

        ad.is_active = not ad.is_active
        ad.updated_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": f"Ad {ad_id} {'activated' if ad.is_active else 'deactivated'}"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling ad status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle status")


@router.put("/{content_type}/{content_id}/moderate", response_model=dict)
def moderate_content_generic(
    content_type: str,
    content_id: int,
    action: str = Query(..., enum=["approve", "reject"]),
    reason: Optional[str] = Query(None, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """
    Moderate any content type - approve or reject (ADMIN only)
    Supports: advertisement, sponsored_post
    """
    try:
        if content_type == "advertisement":
            content = db.query(Advertisement).filter(Advertisement.id == content_id).first()
            if not content:
                raise HTTPException(status_code=404, detail="Advertisement not found")

            if action == "approve":
                if content.is_approved:
                    raise HTTPException(status_code=400, detail="Already approved")
                content.is_approved = True
                content.is_active = True
                content.approved_at = datetime.now(timezone.utc)
                content.approved_by = current_user.user_uid
                content.rejected_at = None
                content.rejected_by = None
                content.rejection_reason = None
            else:
                if content.is_approved:
                    raise HTTPException(status_code=400, detail="Cannot reject already approved content")
                if not reason:
                    raise HTTPException(status_code=400, detail="Rejection reason required")
                content.is_approved = False
                content.is_active = False
                content.rejected_at = datetime.now(timezone.utc)
                content.rejected_by = current_user.user_uid
                content.rejection_reason = reason

        elif content_type == "sponsored_post":
            content = db.query(SponsoredPost).filter(SponsoredPost.id == content_id).first()
            if not content:
                raise HTTPException(status_code=404, detail="Sponsored post not found")

            if action == "approve":
                if content.is_approved:
                    raise HTTPException(status_code=400, detail="Already approved")
                content.is_approved = True
                content.approved_at = datetime.now(timezone.utc)
                content.approved_by = current_user.user_uid
                content.rejected_at = None
                content.rejected_by = None
                content.rejection_reason = None
            else:
                if content.is_approved:
                    raise HTTPException(status_code=400, detail="Cannot reject already approved content")
                if not reason:
                    raise HTTPException(status_code=400, detail="Rejection reason required")
                content.is_approved = False
                content.rejected_at = datetime.now(timezone.utc)
                content.rejected_by = current_user.user_uid
                content.rejection_reason = reason
        else:
            raise HTTPException(status_code=400, detail="Invalid content type. Use 'advertisement' or 'sponsored_post'")

        content.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(content)
        return {"message": f"{content_type} {content_id} {action}ed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error moderating content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to moderate content")


@router.get("/advertisements/pending", response_model=List[AdvertisementOut])
def get_pending_advertisements(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get all pending advertisements (not approved and not rejected) (ADMIN only)"""
    try:
        ads = db.query(Advertisement).filter(
            Advertisement.is_approved == False,
            Advertisement.rejected_at == None
        ).order_by(desc(Advertisement.created_at)).offset(offset).limit(limit).all()
        total = db.query(Advertisement).filter(
            Advertisement.is_approved == False,
            Advertisement.rejected_at == None
        ).count()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": ads}
    except Exception as e:
        logger.error(f"Error fetching pending advertisements: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending advertisements")


@router.get("/sponsored-posts/pending", response_model=List[SponsoredPostOut])
def get_pending_sponsored_posts(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get all pending sponsored posts (not approved and not rejected) (ADMIN only)"""
    try:
        posts = db.query(SponsoredPost).filter(
            SponsoredPost.is_approved == False,
            SponsoredPost.rejected_at == None
        ).order_by(desc(SponsoredPost.created_at)).offset(offset).limit(limit).all()
        total = db.query(SponsoredPost).filter(
            SponsoredPost.is_approved == False,
            SponsoredPost.rejected_at == None
        ).count()
        return {"total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total, "items": posts}
    except Exception as e:
        logger.error(f"Error fetching pending sponsored posts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch pending sponsored posts")


@router.get("/advertisements/{ad_id}", response_model=AdvertisementOut)
def get_advertisement_by_id(
    ad_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Get advertisement by ID (ADMIN only)"""
    try:
        ad = db.query(Advertisement).filter(Advertisement.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Advertisement not found")
        return ad
    except Exception as e:
        logger.error(f"Error fetching advertisement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch advertisement")
