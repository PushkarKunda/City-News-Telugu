# routes/post_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Body
from sqlalchemy import desc
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone

from models.post import Post, PostComment, PostHashtag
from services.avatar_service import get_avatar_for_user
from auth.dependencies import get_current_user, require_roles
from database import get_db
from models.user import User
from services.post_service import PostService
from schemas import PostCommentCreate, PostCreate, PostShareRequest, PostUpdate, UserRole
from middleware.rate_limit import rate_limit
from services.cache_service import cache

router = APIRouter(prefix="/posts", tags=["Posts"])


# =========================================================
# CREATE POST
# =========================================================

@router.post("/", status_code=201)
@rate_limit("5/minute")
def create_post(
    request: Request,
    post_data: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new post (max 5 hashtags)"""
    
    if not post_data.content and not post_data.image_url and not post_data.video_url:
        raise HTTPException(400, "Post must have content, image, or video")
    
    if post_data.content and len(post_data.content) > 5000:
        raise HTTPException(400, "Content too long (max 5000 characters)")
    
    service = PostService(db)
    new_post = service.create_post(
        user_uid=current_user.user_uid,
        content=post_data.content or "",
        image_url=str(post_data.image_url) if post_data.image_url else None,
        video_url=str(post_data.video_url) if post_data.video_url else None
    )
    
    return {
        "success": True,
        "message": "Post created successfully",
        "post": {
            "post_uid": new_post.post_uid,
            "content": new_post.content,
            "image_url": new_post.image_url,
            "video_url": new_post.video_url,
            "hashtags": [h.name for h in new_post.hashtags],
            "created_at": new_post.created_at.isoformat()
        }
    }


# =========================================================
# READ POSTS
# =========================================================

# routes/post_routes.py - CORRECT VERSION

@router.get("/feed")
@rate_limit("50/minute")
def get_public_feed(
    request: Request,
    limit: int = Query(20, ge=1, le=50, description="Number of posts per page"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get public feed with pagination"""
    
    service = PostService(db)
    posts, has_more, next_cursor = service.get_public_feed(limit, cursor)
    
    return {
        "posts": posts,
        "has_more": has_more,
        "next_cursor": next_cursor
    }


@router.get("/{post_uid}")
def get_post(
    post_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single post by UID"""
    
    service = PostService(db)
    post = service.get_post(post_uid, current_user.user_uid)
    
    if not post:
        raise HTTPException(404, "Post not found")
    
    return post


@router.get("/user/{user_uid}")
def get_user_posts(
    user_uid: str,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get posts by specific user"""
    
    target_user = db.query(User).filter(User.user_uid == user_uid).first()
    if not target_user:
        raise HTTPException(404, "User not found")
    
    service = PostService(db)
    posts = service.get_user_posts(user_uid, limit)
    
    return {
        "user": {
            "user_uid": target_user.user_uid,
            "user_name": target_user.user_name,
            "display_name": target_user.name,
            "profile_picture": get_avatar_for_user(target_user.name, target_user.user_uid)
        },
        "posts": posts,
        "total": len(posts)
    }


# =========================================================
# UPDATE & DELETE POST
# =========================================================

@router.put("/{post_uid}")
@rate_limit("5/minute")
def update_post(
    request: Request,
    post_uid: str,
    post_data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a post (role-based permissions)"""
    
    service = PostService(db)
    result = service.update_post(
        post_uid=post_uid,
        user=current_user,
        content=post_data.content,
        image_url=str(post_data.image_url) if post_data.image_url else None,
        video_url=str(post_data.video_url) if post_data.video_url else None
    )
    
    if not result["success"]:
        raise HTTPException(400, result["message"])
    
    return {
        "success": True,
        "message": result["message"],
        "updated_fields": result["updated_fields"],
        "hashtags_changed": result.get("hashtags_changed", False),
        "post": {
            "post_uid": result["post"].post_uid,
            "content": result["post"].content,
            "image_url": result["post"].image_url,
            "video_url": result["post"].video_url,
            "hashtags": [h.name for h in result["post"].hashtags],
            "is_edited": result["post"].is_edited,
            "edited_at": result["post"].edited_at.isoformat() if result["post"].edited_at else None,
            "updated_at": result["post"].updated_at.isoformat()
        }
    }


@router.delete("/{post_uid}")
@rate_limit("5/minute")
def delete_post(
    request: Request,
    post_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a post (role-based permissions)"""
    
    service = PostService(db)
    result = service.delete_post(post_uid, current_user)
    
    if not result:
        raise HTTPException(404, "Post not found or unauthorized")
    
    return {"success": True, "message": "Post deleted successfully"}


# =========================================================
# HASHTAG EDIT (Moderator+ only)
# =========================================================

@router.patch("/{post_uid}/hashtags")
@rate_limit("5/minute")
def edit_post_hashtags(
    request: Request,
    post_uid: str,
    hashtags: List[str] = Body(..., max_items=5),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.MODERATOR, UserRole.EMPLOYEE, UserRole.ADMIN]))
):
    """
    Edit hashtags of a post (Moderator+ only)
    Max 5 hashtags allowed
    """
    
    if len(hashtags) > 5:
        raise HTTPException(400, "Maximum 5 hashtags allowed")
    
    post = db.query(Post).filter(Post.post_uid == post_uid).first()
    if not post:
        raise HTTPException(404, "Post not found")
    
    service = PostService(db)
    
    # Remove old hashtags
    for hashtag in post.hashtags:
        if hashtag.usage_count > 0:
            hashtag.usage_count -= 1
            if hashtag.usage_count == 0:
                db.delete(hashtag)
    post.hashtags.clear()
    
    # Add new hashtags
    if hashtags:
        processed = service.process_hashtags(hashtags)
        post.hashtags = processed
        post.hashtag_count = len(processed)
    
    post.is_edited = True
    post.edited_at = datetime.now(timezone.utc)
    post.edited_by_uid = current_user.user_uid
    post.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(post)
    
    # Invalidate cache
    cache.delete_pattern("cache:get_public_feed:*")
    
    return {
        "success": True,
        "message": "Hashtags updated successfully",
        "hashtags": [h.name for h in post.hashtags]
    }


# =========================================================
# ENGAGEMENT
# =========================================================

@router.post("/{post_uid}/like")
@rate_limit("50/minute")
def like_post(
    request: Request,
    post_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Like or unlike a post"""
    
    post = db.query(Post).filter(Post.post_uid == post_uid).first()
    if not post:
        raise HTTPException(404, "Post not found")
    
    service = PostService(db)
    result = service.like_post(post.id, current_user.user_uid)
    
    return {"liked": result["is_liked"], "like_count": result["like_count"]}


@router.post("/{post_uid}/comment")
@rate_limit("20/minute")
def add_comment(
    request: Request,
    post_uid: str,
    comment_data: PostCommentCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add comment to post"""
    
    if not comment_data.comment_text or len(comment_data.comment_text.strip()) < 1:
        raise HTTPException(400, "Comment cannot be empty")
    
    if len(comment_data.comment_text) > 1000:
        raise HTTPException(400, "Comment too long (max 1000 characters)")
    
    post = db.query(Post).filter(Post.post_uid == post_uid).first()
    if not post:
        raise HTTPException(404, "Post not found")
    
    service = PostService(db)
    result = service.add_comment(post.id, current_user.user_uid, comment_data.comment_text.strip())
    
    if not result["success"]:
        raise HTTPException(400, result["message"])
    
    return {"success": True, "comment": result["comment"]}


@router.get("/{post_uid}/comments")
def get_comments(
    post_uid: str,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get comments for a post"""
    
    post = db.query(Post).filter(Post.post_uid == post_uid).first()
    if not post:
        raise HTTPException(404, "Post not found")
    
    total = db.query(PostComment).filter(PostComment.post_id == post.id).count()
    comments = db.query(PostComment).filter(
        PostComment.post_id == post.id
    ).order_by(desc(PostComment.created_at)).offset(offset).limit(limit).all()
    
    result = []
    for comment in comments:
        user = db.query(User).filter(User.user_uid == comment.user_uid).first()
        result.append({
            "id": comment.id,
            "comment_text": comment.comment_text,
            "user_uid": comment.user_uid,
            "user_name": user.user_name if user else None,
            "user_display_name": user.name if user else None,
            "user_profile_picture": get_avatar_for_user(user.name, user.user_uid) if user else None,
            "created_at": comment.created_at.isoformat(),
            "time_ago": get_time_ago(comment.created_at)
        })
    
    return {
        "total": total,
        "comments": result,
        "has_more": offset + limit < total
    }


@router.post("/{post_uid}/share")
@rate_limit("10/minute")
def share_post(
    request: Request,
    post_uid: str,
    share_data: Optional[PostShareRequest] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Share a post to external platforms"""
    
    post = db.query(Post).filter(Post.post_uid == post_uid).first()
    if not post:
        raise HTTPException(404, "Post not found")
    
    platform = share_data.platform if share_data else None
    service = PostService(db)
    result = service.share_post(post.id, current_user.user_uid, platform)
    
    user = db.query(User).filter(User.user_uid == post.user_uid).first()
    share_text = f"Check out this post by {user.user_name or user.name}\n\n{post.content[:200]}..."
    
    share_urls = {
        "whatsapp": f"https://wa.me/?text={share_text} {get_full_post_url(post_uid)}",
        "twitter": f"https://twitter.com/intent/tweet?text={share_text}&url={get_full_post_url(post_uid)}",
        "facebook": f"https://www.facebook.com/sharer/sharer.php?u={get_full_post_url(post_uid)}",
    }
    
    return {
        "success": True,
        "share_count": result["share_count"],
        "share_text": share_text,
        "post_url": get_full_post_url(post_uid),
        "share_links": share_urls
    }


# =========================================================
# HASHTAG ENDPOINTS
# =========================================================

@router.get("/hashtags/trending")
@rate_limit("50/minute")
def get_trending_hashtags(
    request: Request,
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get trending hashtags"""
    
    service = PostService(db)
    hashtags = service.get_trending_hashtags(limit)
    
    return {"hashtags": hashtags}


@router.get("/hashtags/suggestions")
@rate_limit("50/minute")
def get_hashtag_suggestions(
    request: Request,
    query: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(10, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get hashtag suggestions while typing"""
    
    hashtags = db.query(PostHashtag).filter(
        PostHashtag.name.startswith(query.lower()),
        PostHashtag.usage_count > 0
    ).order_by(
        desc(PostHashtag.usage_count)
    ).limit(limit).all()
    
    return {
        "suggestions": [
            {"name": h.name, "usage_count": h.usage_count}
            for h in hashtags
        ]
    }


@router.get("/hashtag/{hashtag_name}/posts")
def get_posts_by_hashtag(
    hashtag_name: str,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get posts by hashtag"""
    
    service = PostService(db)
    posts = service.get_posts_by_hashtag(hashtag_name, limit)
    
    return {
        "hashtag": hashtag_name,
        "posts": posts,
        "count": len(posts)
    }


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def get_full_post_url(post_uid: str) -> str:
    """Generate full URL for a post"""
    base_url = "https://yourdomain.com"
    return f"{base_url}/posts/{post_uid}"


def get_time_ago(dt: datetime) -> str:
    """Get human-readable time ago string"""
    now = datetime.now(dt.tzinfo)
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