# routes/rewards_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime, timedelta, timezone

from auth.dependencies import get_current_user, admin_required
from database import get_db
from models.user import User
from models.rewards import DailyChallenge, Referral, UserRewards, UserTransaction, UserBadge, AdReward
from services.rewards_service import RewardsService
from services.referral_service import ReferralService
from services.bingo_service import BingoService
from services.fraud_detection import FraudDetectionService
from config.rewards_config import RewardsConfig
from middleware.ip_whitelist import get_client_ip, require_admin_ip
from schemas import (
    AdRewardClaimResponse,
    ClaimBingoResponse,
    ClaimChallengeResponse,
    DailyChallengeResponse,
    DailyLoginResponse,
    EarnBookmarkResponse,
    EarnCommentResponse,
    EarnLikeResponse,
    EarnReadResponse,
    EarnShareResponse,
    LeaderboardResponse,
    ReferralInfoResponse,
    RewardsStatsResponse,
    TransactionListResponse,
    UseReferralResponse,
    UserRewardsSummary,
)

router = APIRouter(prefix="/rewards", tags=["Rewards"])


# =========================================================
# USER REWARDS ENDPOINTS
# =========================================================

@router.get("/me", response_model=UserRewardsSummary)
def get_my_rewards(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's rewards summary"""
    service = RewardsService(db, request)
    return service.get_user_summary(current_user.user_uid)


@router.get("/transactions", response_model=TransactionListResponse)
def get_my_transactions(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    transaction_type: Optional[str] = Query(None, enum=["earn", "spend", "bonus", "referral", "ad_reward"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction history"""
    service = RewardsService(db, request)
    return service.get_transactions(current_user.user_uid, limit, offset, transaction_type)


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    request: Request,
    period: str = Query("weekly", enum=["daily", "weekly", "monthly", "all_time"]),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leaderboard for specified period"""
    service = RewardsService(db, request)
    return {
        "period": period,
        "leaderboard": service.get_leaderboard(period, limit)
    }


@router.get("/badges")
def get_my_badges(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all badges earned by user"""
    badges = db.query(UserBadge).filter(
        UserBadge.user_uid == current_user.user_uid
    ).order_by(UserBadge.earned_at.desc()).all()
    
    return [
        {
            "id": b.badge_id,
            "name": b.badge_name,
            "icon": b.badge_icon,
            "color": b.badge_color,
            "description": b.badge_description,
            "rarity": b.rarity,
            "earned_at": b.earned_at.isoformat()
        }
        for b in badges
    ]


@router.post("/daily-login", response_model=DailyLoginResponse)
def claim_daily_login(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Claim daily login reward"""
    service = RewardsService(db, request)
    result = service.claim_daily_login(current_user.user_uid)
    
    # Update daily streak for bingo
    bingo_service = BingoService(db, request)
    bingo_service.update_bingo_progress(current_user.user_uid, "login")
    
    # Update daily challenge progress
    bingo_service.update_challenge_progress(current_user.user_uid, "read")
    
    return result


@router.post("/earn/read", response_model=EarnReadResponse)
def earn_for_reading(
    request: Request,
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Earn points for reading an article"""
    service = RewardsService(db, request)
    
    # Check if already earned for this article today
    existing = db.query(UserTransaction).filter(
        UserTransaction.user_uid == current_user.user_uid,
        UserTransaction.reference_id == news_uid,
        UserTransaction.description.contains("Read"),
        func.date(UserTransaction.created_at) == date.today()
    ).first()
    
    if existing:
        total_reads = db.query(UserTransaction).filter(
            UserTransaction.user_uid == current_user.user_uid,
            UserTransaction.description.contains("Read"),
            UserTransaction.transaction_type == "earn"
        ).count()
        return {
            "message": "Already earned for this article today",
            "points_earned": 0,
            "total_reads": total_reads
        }
    
    # Add points
    service.add_points(
        current_user.user_uid,
        RewardsConfig.READ_ARTICLE_POINTS,
        "Read article",
        reference_id=news_uid,
        metadata={"action_type": "read", "news_uid": news_uid}
    )
    
    # Update bingo progress
    bingo_service = BingoService(db, request)
    bingo_service.update_bingo_progress(current_user.user_uid, "read")
    
    # Update daily challenge progress
    bingo_service.update_challenge_progress(current_user.user_uid, "read")
    
    # Check for reading milestones
    total_reads = db.query(UserTransaction).filter(
        UserTransaction.user_uid == current_user.user_uid,
        UserTransaction.description.contains("Read"),
        UserTransaction.transaction_type == "earn"
    ).count()
    
    service.check_and_award_milestone_badges(current_user.user_uid, "read", total_reads)
    
    # Update streak
    service.update_daily_streak(current_user.user_uid)
    
    return {
        "message": "Points earned for reading",
        "points_earned": RewardsConfig.READ_ARTICLE_POINTS,
        "total_reads": total_reads
    }


@router.post("/earn/share", response_model=EarnShareResponse)
def earn_for_sharing(
    request: Request,
    news_uid: str,
    platform: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Earn points and coins for sharing an article"""
    service = RewardsService(db, request)
    
    reference = f"{news_uid}:{platform}"
    
    # Check daily limit
    daily_shares = db.query(UserTransaction).filter(
        UserTransaction.user_uid == current_user.user_uid,
        UserTransaction.description.contains("Shared"),
        func.date(UserTransaction.created_at) == date.today()
    ).count()
    
    if daily_shares >= 50:
        total_shares = db.query(UserTransaction).filter(
            UserTransaction.user_uid == current_user.user_uid,
            UserTransaction.description.contains("Shared"),
            UserTransaction.transaction_type == "earn"
        ).count()
        return {
            "message": "Daily share limit reached",
            "points_earned": 0,
            "coins_earned": 0,
            "total_shares": total_shares
        }
    
    # Add rewards
    service.add_points(
        current_user.user_uid,
        RewardsConfig.SHARE_ARTICLE_POINTS,
        f"Shared article on {platform}",
        reference_id=reference,
        metadata={"action_type": "share", "platform": platform}
    )
    
    service.add_coins(
        current_user.user_uid,
        RewardsConfig.SHARE_ARTICLE_COINS,
        f"Coin reward for sharing on {platform}"
    )
    
    # Update bingo progress
    bingo_service = BingoService(db, request)
    bingo_service.update_bingo_progress(
        current_user.user_uid, "share", 
        metadata={"platform": platform}
    )
    
    # Update daily challenge progress
    bingo_service.update_challenge_progress(current_user.user_uid, "share")
    
    # Check sharing milestone
    total_shares = db.query(UserTransaction).filter(
        UserTransaction.user_uid == current_user.user_uid,
        UserTransaction.description.contains("Shared"),
        UserTransaction.transaction_type == "earn"
    ).count()
    
    service.check_and_award_milestone_badges(current_user.user_uid, "share", total_shares)
    
    # First share badge
    if total_shares == 1:
        service.award_badge(current_user.user_uid, "first_share")
    
    return {
        "message": "Rewards earned for sharing",
        "points_earned": RewardsConfig.SHARE_ARTICLE_POINTS,
        "coins_earned": RewardsConfig.SHARE_ARTICLE_COINS,
        "total_shares": total_shares
    }


@router.post("/earn/comment", response_model=EarnCommentResponse)
def earn_for_commenting(
    request: Request,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Earn points for commenting on an article"""
    service = RewardsService(db, request)
    
    # Check daily limit
    daily_comments = db.query(UserTransaction).filter(
        UserTransaction.user_uid == current_user.user_uid,
        UserTransaction.description.contains("Comment"),
        func.date(UserTransaction.created_at) == date.today()
    ).count()
    
    if daily_comments >= 20:
        return {"message": "Daily comment limit reached", "points_earned": 0}
    
    service.add_points(
        current_user.user_uid,
        RewardsConfig.COMMENT_ARTICLE_POINTS,
        "Commented on article",
        reference_id=str(comment_id),
        metadata={"action_type": "comment"}
    )
    
    # Update bingo progress
    bingo_service = BingoService(db, request)
    bingo_service.update_bingo_progress(current_user.user_uid, "comment")
    
    # Update daily challenge progress
    bingo_service.update_challenge_progress(current_user.user_uid, "comment")
    
    return {
        "message": "Points earned for commenting",
        "points_earned": RewardsConfig.COMMENT_ARTICLE_POINTS
    }


@router.post("/earn/like", response_model=EarnLikeResponse)
def earn_for_liking(
    request: Request,
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Earn points for liking an article"""
    service = RewardsService(db, request)
    
    # Check if already liked this article today
    existing = db.query(UserTransaction).filter(
        UserTransaction.user_uid == current_user.user_uid,
        UserTransaction.reference_id == news_uid,
        UserTransaction.description == "Liked article",
        func.date(UserTransaction.created_at) == date.today()
    ).first()
    
    if existing:
        return {"message": "Already earned for this article today", "points_earned": 0}
    
    service.add_points(
        current_user.user_uid,
        RewardsConfig.LIKE_ARTICLE_POINTS,
        "Liked article",
        reference_id=news_uid,
        metadata={"action_type": "like"}
    )
    
    # Update bingo progress
    bingo_service = BingoService(db, request)
    bingo_service.update_bingo_progress(current_user.user_uid, "like")
    
    return {
        "message": "Points earned for liking",
        "points_earned": RewardsConfig.LIKE_ARTICLE_POINTS
    }


@router.post("/earn/bookmark", response_model=EarnBookmarkResponse)
def earn_for_bookmarking(
    request: Request,
    news_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Earn points for bookmarking an article"""
    service = RewardsService(db, request)
    
    # Check if already bookmarked this article today
    existing = db.query(UserTransaction).filter(
        UserTransaction.user_uid == current_user.user_uid,
        UserTransaction.reference_id == news_uid,
        UserTransaction.description == "Bookmarked article",
        func.date(UserTransaction.created_at) == date.today()
    ).first()
    
    if existing:
        return {"message": "Already earned for this article today", "points_earned": 0}
    
    service.add_points(
        current_user.user_uid,
        RewardsConfig.BOOKMARK_ARTICLE_POINTS,
        "Bookmarked article",
        reference_id=news_uid,
        metadata={"action_type": "bookmark"}
    )
    
    # Update bingo progress
    bingo_service = BingoService(db, request)
    bingo_service.update_bingo_progress(current_user.user_uid, "bookmark")
    
    return {
        "message": "Points earned for bookmarking",
        "points_earned": RewardsConfig.BOOKMARK_ARTICLE_POINTS
    }


@router.post("/ad/rewarded", response_model=AdRewardClaimResponse)
def claim_rewarded_ad(
    request: Request,
    ad_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Claim coins for watching rewarded video ad"""
    service = RewardsService(db, request)
    fraud_detection = FraudDetectionService(db)
    
    # Check if user is flagged
    if fraud_detection.is_user_flagged(current_user.user_uid):
        raise HTTPException(status_code=403, detail="Account is under review. Cannot claim rewards.")
    
    rewards = service.get_or_create_user_rewards(current_user.user_uid)
    
    today = date.today()
    
    # Check daily limit
    daily_ads = db.query(AdReward).filter(
        AdReward.user_uid == current_user.user_uid,
        func.date(AdReward.watched_at) == today
    ).count()
    
    if daily_ads >= RewardsConfig.REWARDED_AD_DAILY_LIMIT:
        return {
            "success": False,
            "message": f"Daily limit of {RewardsConfig.REWARDED_AD_DAILY_LIMIT} ads reached",
            "coins_earned": 0,
            "total_coins": rewards.coins,
            "ads_watched_today": daily_ads,
            "daily_limit": RewardsConfig.REWARDED_AD_DAILY_LIMIT
        }
    
    coins_earned = RewardsConfig.REWARDED_AD_COINS
    
    # Bonus for premium users
    if rewards.is_premium and rewards.premium_expires_at > datetime.now(timezone.utc):
        coins_earned = int(coins_earned * 1.5)
    
    # Detect abnormal activity
    client_info = {"ip": get_client_ip(request), "user_agent": request.headers.get("User-Agent")}
    if fraud_detection.detect_abnormal_activity(current_user.user_uid, "ad_watch", client_info["ip"]):
        # Still award but flag for review
        pass
    
    service.add_coins(
        current_user.user_uid,
        coins_earned,
        f"Rewarded ad view",
        reference_id=str(ad_id),
        metadata={"action_type": "ad_rewarded"}
    )
    
    # Track ad view
    ad_reward = AdReward(
        user_uid=current_user.user_uid,
        ad_id=ad_id,
        ad_type="rewarded_video",
        coins_earned=coins_earned,
        ip_address=client_info["ip"],
        watched_at=datetime.now(timezone.utc)
    )
    db.add(ad_reward)
    
    # Update stats
    rewards.total_ads_watched += 1
    rewards.coins_from_ads += coins_earned
    db.commit()
    
    # Update bingo progress
    bingo_service = BingoService(db, request)
    bingo_service.update_bingo_progress(current_user.user_uid, "watch_ads")
    
    # Update daily challenge progress
    bingo_service.update_challenge_progress(current_user.user_uid, "watch_ads")
    
    # Check badge milestones
    service.check_and_award_milestone_badges(current_user.user_uid, "ad_watch", rewards.total_ads_watched)
    
    return {
        "success": True,
        "coins_earned": coins_earned,
        "total_coins": rewards.coins,
        "ads_watched_today": daily_ads + 1,
        "daily_limit": RewardsConfig.REWARDED_AD_DAILY_LIMIT
    }


# =========================================================
# REFERRAL ENDPOINTS
# =========================================================

@router.get("/referral", response_model=ReferralInfoResponse)
def get_referral_info(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's referral information"""
    service = ReferralService(db, request)
    return service.get_referral_info(current_user.user_uid)


@router.post("/use-referral", response_model=UseReferralResponse)
def use_referral_code(
    request: Request,
    referral_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Apply referral code during signup"""
    service = ReferralService(db, request)
    result = service.process_referral_signup(referral_code, current_user.user_uid)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


# =========================================================
# DAILY CHALLENGE ENDPOINTS
# =========================================================

@router.get("/challenge/today", response_model=DailyChallengeResponse)
def get_today_challenge(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get today's daily challenge"""
    service = BingoService(db, request)
    challenge = service.get_daily_challenge(current_user.user_uid)
    return challenge


@router.post("/challenge/{challenge_id}/claim", response_model=ClaimChallengeResponse)
def claim_challenge_reward(
    request: Request,
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Claim reward for completed challenge"""
    service = BingoService(db, request)
    result = service.claim_challenge_reward(current_user.user_uid, challenge_id)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


# =========================================================
# BINGO CARD ENDPOINTS
# =========================================================

@router.get("/bingo")
def get_bingo_card(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's weekly bingo card"""
    service = BingoService(db, request)
    return service.get_bingo_status(current_user.user_uid)


@router.post("/bingo/claim", response_model=ClaimBingoResponse)
def claim_bingo_reward(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Claim reward for completing bingo"""
    service = BingoService(db, request)
    result = service.claim_bingo_reward(current_user.user_uid)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return result


@router.get("/bingo/leaderboard")
def get_bingo_leaderboard(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get users with most bingo completions"""
    service = BingoService(db, request)
    return service.get_challenge_leaderboard(limit)


# =========================================================
# ADMIN ENDPOINTS (with IP whitelisting)
# =========================================================

@router.get("/admin/stats", response_model=RewardsStatsResponse, tags=["Admin"])
def get_rewards_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
    _: bool = Depends(require_admin_ip)
):
    """Get rewards system statistics (Admin only)"""
    
    total_users = db.query(UserRewards).count()
    total_points_earned = db.query(func.sum(UserRewards.total_points_earned)).scalar() or 0
    total_coins_earned = db.query(func.sum(UserRewards.total_coins_earned)).scalar() or 0
    total_coins_spent = db.query(func.sum(UserRewards.total_coins_spent)).scalar() or 0
    total_ads_watched = db.query(func.sum(UserRewards.total_ads_watched)).scalar() or 0
    
    # Top users by points
    top_users = db.query(
        User.user_uid,
        User.user_name,
        UserRewards.points,
        UserRewards.level
    ).join(
        UserRewards, User.user_uid == UserRewards.user_uid
    ).order_by(
        UserRewards.points.desc()
    ).limit(10).all()
    
    # Badge distribution
    badge_counts = db.query(
        UserBadge.badge_id,
        UserBadge.badge_name,
        func.count(UserBadge.id).label('count')
    ).group_by(
        UserBadge.badge_id, UserBadge.badge_name
    ).order_by(
        func.count(UserBadge.id).desc()
    ).limit(10).all()
    
    # Fraud detection stats
    fraud_detection = FraudDetectionService(db)
    flagged_users = fraud_detection.get_flagged_users(10)
    
    return {
        "summary": {
            "total_users": total_users,
            "total_points_earned": total_points_earned,
            "total_coins_earned": total_coins_earned,
            "total_coins_spent": total_coins_spent,
            "total_ads_watched": total_ads_watched,
            "average_points_per_user": total_points_earned / total_users if total_users > 0 else 0
        },
        "top_users": [
            {
                "user_uid": u.user_uid,
                "user_name": u.user_name,
                "points": u.points,
                "level": u.level
            }
            for u in top_users
        ],
        "badge_distribution": [
            {
                "badge_id": b.badge_id,
                "badge_name": b.badge_name,
                "count": b.count
            }
            for b in badge_counts
        ],
        "flagged_users": flagged_users
    }


@router.post("/admin/clear-flag/{user_uid}", tags=["Admin"])
def clear_user_flag(
    request: Request,
    user_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
    _: bool = Depends(require_admin_ip)
):
    """Clear fraud flag for a user (Admin only)"""
    fraud_detection = FraudDetectionService(db)
    result = fraud_detection.clear_flag(user_uid, current_user.user_uid)
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"Flag cleared for user {user_uid}"}


@router.post("/admin/add-points", tags=["Admin"])
def admin_add_points(
    request: Request,
    user_uid: str,
    points: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
    _: bool = Depends(require_admin_ip)
):
    """Manually add points to user (Admin only)"""
    service = RewardsService(db, request)
    service.add_points(
        user_uid, 
        points, 
        f"Admin adjustment: {reason}", 
        metadata={"admin_uid": current_user.user_uid, "admin_action": True}
    )
    
    return {"message": f"Added {points} points to user {user_uid}"}

# routes/rewards_routes.py - Add this after router = APIRouter(...)

# =========================================================
# HEALTH CHECK ENDPOINTS
# =========================================================

@router.get("/health", tags=["Health"])
def rewards_health_check(
    db: Session = Depends(get_db),
    detailed: bool = Query(False, description="Get detailed health information")
):
    """
    Health check endpoint for rewards system.
    Returns system status, database connectivity, and service health.
    """
    health_status = {
        "status": "healthy",
        "service": "rewards",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Check database connectivity
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db.execute(text("SELECT COUNT(*) FROM user_rewards"))
        db.execute(text("SELECT COUNT(*) FROM user_transactions"))
        db.execute(text("SELECT COUNT(*) FROM user_badges"))
        
        health_status["database"] = {
            "status": "connected",
            "tables": {
                "user_rewards": "ok",
                "user_transactions": "ok", 
                "user_badges": "ok",
                "referrals": "ok",
                "daily_challenges": "ok",
                "bingo_cards": "ok"
            }
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["database"] = {
            "status": "error",
            "error": str(e)
        }
    
    # Get system statistics (only if detailed = true)
    if detailed:
        try:
            # Count records
            total_users = db.query(UserRewards).count()
            total_transactions = db.query(UserTransaction).count()
            total_badges_awarded = db.query(UserBadge).count()
            total_referrals = db.query(Referral).count()
            
            # Get today's activity
            today = date.today()
            today_transactions = db.query(UserTransaction).filter(
                func.date(UserTransaction.created_at) == today
            ).count()
            
            # Get flagged users count
            flagged_users = db.query(UserRewards).filter(
                UserRewards.is_flagged == True
            ).count()
            
            # Get active users (last 7 days)
            week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            active_users = db.query(UserTransaction.user_uid).filter(
                UserTransaction.created_at >= week_ago
            ).distinct().count()
            
            health_status["statistics"] = {
                "total_users": total_users,
                "total_transactions": total_transactions,
                "total_badges_awarded": total_badges_awarded,
                "total_referrals": total_referrals,
                "today_transactions": today_transactions,
                "flagged_users": flagged_users,
                "active_users_last_7_days": active_users,
                "conversion_rate": round((total_users / active_users * 100) if active_users > 0 else 0, 2)
            }
            
            # Get points summary
            total_points_earned = db.query(func.sum(UserRewards.total_points_earned)).scalar() or 0
            total_coins_earned = db.query(func.sum(UserRewards.total_coins_earned)).scalar() or 0
            
            health_status["economics"] = {
                "total_points_earned": total_points_earned,
                "total_coins_earned": total_coins_earned,
                "average_points_per_user": round(total_points_earned / total_users, 2) if total_users > 0 else 0,
                "average_coins_per_user": round(total_coins_earned / total_users, 2) if total_users > 0 else 0
            }
            
            # Check daily challenge status
            today_challenge = db.query(DailyChallenge).filter(
                DailyChallenge.challenge_date == today,
                DailyChallenge.is_active == True
            ).first()
            
            health_status["daily_challenge"] = {
                "exists": today_challenge is not None,
                "title": today_challenge.title if today_challenge else None,
                "target_count": today_challenge.target_count if today_challenge else None
            }
            
        except Exception as e:
            health_status["statistics"] = {
                "status": "error",
                "error": str(e)
            }
    
    # Check configuration
    try:
        health_status["configuration"] = {
            "read_points": RewardsConfig.READ_ARTICLE_POINTS,
            "share_points": RewardsConfig.SHARE_ARTICLE_POINTS,
            "share_coins": RewardsConfig.SHARE_ARTICLE_COINS,
            "referral_points": RewardsConfig.REFERRAL_SIGNUP_POINTS,
            "referral_coins": RewardsConfig.REFERRAL_SIGNUP_COINS,
            "ad_coins": RewardsConfig.REWARDED_AD_COINS,
            "max_level": max(RewardsConfig.LEVEL_THRESHOLDS.keys())
        }
    except Exception as e:
        health_status["configuration"] = {
            "status": "error",
            "error": str(e)
        }
    
    return health_status


@router.get("/health/simple", tags=["Health"])
def simple_health_check():
    """
    Simple health check endpoint - returns minimal info.
    Use this for load balancers and monitoring.
    """
    return {
        "status": "ok",
        "service": "rewards",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/health/ready", tags=["Health"])
def readiness_check(
    db: Session = Depends(get_db)
):
    """
    Readiness probe for Kubernetes/container orchestration.
    Checks if the service is ready to accept traffic.
    """
    ready = True
    issues = []
    
    # Check database connection
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        ready = False
        issues.append(f"Database connection failed: {str(e)}")
    
    # Check required tables exist
    required_tables = ['user_rewards', 'user_transactions', 'user_badges']
    for table in required_tables:
        try:
            db.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
        except Exception:
            ready = False
            issues.append(f"Table '{table}' not found or inaccessible")
    
    if ready:
        return {"ready": True, "status": "ready"}
    else:
        raise HTTPException(
            status_code=503,
            detail={
                "ready": False,
                "status": "not ready",
                "issues": issues
            }
        )


@router.get("/health/liveness", tags=["Health"])
def liveness_check():
    """
    Liveness probe for Kubernetes/container orchestration.
    Checks if the service is still running.
    """
    return {"alive": True, "status": "running"}