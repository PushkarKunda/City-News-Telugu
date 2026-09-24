# routes/follow_routes.py - COMPLETE FIXED VERSION

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from auth.dependencies import get_current_user
from database import get_db
from models.user import User
from services.follow_service import FollowService
from services.post_service import PostService  # ✅ Move import to top

router = APIRouter(prefix="/follow", tags=["Follow"])


@router.post("/{user_uid}")
def follow_user(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Follow a user"""
    
    if current_user.user_uid == user_uid:
        raise HTTPException(400, "Cannot follow yourself")
    
    service = FollowService(db)
    result = service.follow_user(current_user.user_uid, user_uid)
    
    if not result["success"]:
        raise HTTPException(400, result["message"])
    
    return result


@router.delete("/{user_uid}")
def unfollow_user(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unfollow a user"""
    
    service = FollowService(db)
    result = service.unfollow_user(current_user.user_uid, user_uid)
    
    if not result["success"]:
        raise HTTPException(400, result["message"])
    
    return result


@router.get("/status/{user_uid}")
def get_follow_status(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check follow status between users"""
    
    service = FollowService(db)
    status = service.get_follow_status(current_user.user_uid, user_uid)
    
    return status


@router.get("/counts/{user_uid}")
def get_follow_counts(
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get follower and following counts"""
    
    target_user = db.query(User).filter(User.user_uid == user_uid).first()
    if not target_user:
        raise HTTPException(404, "User not found")
    
    service = FollowService(db)
    counts = service.get_follow_counts(user_uid)
    
    return counts


@router.get("/followers/{user_uid}")
def get_followers(
    user_uid: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get followers of a user"""
    
    target_user = db.query(User).filter(User.user_uid == user_uid).first()
    if not target_user:
        raise HTTPException(404, "User not found")
    
    service = FollowService(db)
    followers = service.get_followers(user_uid, current_user.user_uid, limit, offset)
    
    return followers


@router.get("/following/{user_uid}")
def get_following(
    user_uid: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get users that a user follows"""
    
    target_user = db.query(User).filter(User.user_uid == user_uid).first()
    if not target_user:
        raise HTTPException(404, "User not found")
    
    service = FollowService(db)
    following = service.get_following(user_uid, current_user.user_uid, limit, offset)
    
    return following


@router.get("/suggestions")
def get_follow_suggestions(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get suggested users to follow"""
    
    service = FollowService(db)
    suggestions = service.get_follow_suggestions(current_user.user_uid, limit)
    
    return {"suggestions": suggestions}


@router.get("/feed/posts")
def get_following_posts(
    limit: int = Query(20, ge=1, le=50),
    cursor: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get posts from followed users"""
    
    service = FollowService(db)
    posts, has_more, next_cursor = service.get_following_posts(current_user.user_uid, limit, cursor)
    
    # ✅ PostService imported at top
    post_service = PostService(db)
    
    result = []
    for post in posts:
        post_data = post_service.get_post(post.post_uid, current_user.user_uid)
        if post_data:
            result.append(post_data)
    
    return {
        "posts": result,
        "has_more": has_more,
        "next_cursor": next_cursor
    }