# services/bingo_service.py
import json
import random
from datetime import datetime, timezone, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import logging

from models.rewards import BingoCard, UserChallengeProgress, DailyChallenge
from config.rewards_config import RewardsConfig
from services.rewards_service import RewardsService
from services.fraud_detection import FraudDetectionService

logger = logging.getLogger(__name__)


class BingoService:
    """Complete bingo and daily challenges service"""
    
    def __init__(self, db: Session, request=None):
        self.db = db
        self.request = request
        self.rewards_service = RewardsService(db, request)
        self.fraud_detection = FraudDetectionService(db)
        self._init_daily_challenge()
    
    def _init_daily_challenge(self):
        """Initialize today's daily challenge if not exists"""
        today = date.today()
        existing = self.db.query(DailyChallenge).filter(
            DailyChallenge.challenge_date == today
        ).first()
        
        if not existing:
            self._generate_daily_challenge(today)
    
    def _generate_daily_challenge(self, challenge_date: date) -> DailyChallenge:
        """Generate a random daily challenge"""
        challenges = [
            {
                "title": "📚 Read 10 Articles",
                "description": "Read any 10 articles today",
                "action_type": "read_articles",
                "target_count": 10,
                "reward_points": 100,
                "reward_coins": 20,
            },
            {
                "title": "📤 Share 3 Articles",
                "description": "Share 3 articles on social media",
                "action_type": "share_news",
                "target_count": 3,
                "reward_points": 60,
                "reward_coins": 15,
            },
            {
                "title": "🎥 Watch 5 Ads",
                "description": "Watch 5 rewarded video ads",
                "action_type": "watch_ads",
                "target_count": 5,
                "reward_points": 50,
                "reward_coins": 25,
            },
            {
                "title": "💬 Comment on 5 Articles",
                "description": "Leave comments on 5 different articles",
                "action_type": "comment_articles",
                "target_count": 5,
                "reward_points": 75,
                "reward_coins": 10,
            },
            {
                "title": "👥 Invite 1 Friend",
                "description": "Invite 1 friend to join HyperNews",
                "action_type": "invite_friends",
                "target_count": 1,
                "reward_points": 200,
                "reward_coins": 50,
            },
            {
                "title": "❤️ Like 10 Articles",
                "description": "Like 10 different articles",
                "action_type": "like_articles",
                "target_count": 10,
                "reward_points": 50,
                "reward_coins": 10,
            },
            {
                "title": "🔖 Bookmark 5 Articles",
                "description": "Bookmark 5 articles for later",
                "action_type": "bookmark_articles",
                "target_count": 5,
                "reward_points": 50,
                "reward_coins": 10,
            },
            {
                "title": "🗳️ Vote in 3 Polls",
                "description": "Vote in 3 different polls",
                "action_type": "vote_polls",
                "target_count": 3,
                "reward_points": 75,
                "reward_coins": 15,
            },
        ]
        
        selected = random.choice(challenges)
        
        challenge = DailyChallenge(
            challenge_date=challenge_date,
            title=selected["title"],
            description=selected["description"],
            action_type=selected["action_type"],
            target_count=selected["target_count"],
            reward_points=selected["reward_points"],
            reward_coins=selected["reward_coins"],
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(challenge)
        self.db.commit()
        self.db.refresh(challenge)
        
        logger.info(f"Generated daily challenge for {challenge_date}: {selected['title']}")
        return challenge
    
    def get_daily_challenge(self, user_uid: str) -> dict:
        """Get today's daily challenge with user progress"""
        today = date.today()
        
        challenge = self.db.query(DailyChallenge).filter(
            DailyChallenge.challenge_date == today,
            DailyChallenge.is_active == True
        ).first()
        
        if not challenge:
            challenge = self._generate_daily_challenge(today)
        
        # Get user progress
        progress = self.db.query(UserChallengeProgress).filter(
            UserChallengeProgress.user_uid == user_uid,
            UserChallengeProgress.challenge_id == challenge.id
        ).first()
        
        if not progress:
            progress = UserChallengeProgress(
                user_uid=user_uid,
                challenge_id=challenge.id,
                progress=0,
                completed=False,
                claimed=False
            )
            self.db.add(progress)
            self.db.commit()
        
        return {
            "id": challenge.id,
            "title": challenge.title,
            "description": challenge.description,
            "action_type": challenge.action_type,
            "target_count": challenge.target_count,
            "reward_points": challenge.reward_points,
            "reward_coins": challenge.reward_coins,
            "progress": progress.progress,
            "completed": progress.completed,
            "claimed": progress.claimed,
            "percentage": int(progress.progress / challenge.target_count * 100) if challenge.target_count > 0 else 0
        }
    
    def update_challenge_progress(self, user_uid: str, action_type: str, increment: int = 1):
        """Update user's progress on daily challenges"""
        today = date.today()
        
        action_mapping = {
            "read": "read_articles",
            "share": "share_news",
            "comment": "comment_articles",
            "watch_ads": "watch_ads",
            "invite": "invite_friends",
            "like": "like_articles",
            "bookmark": "bookmark_articles",
            "vote_poll": "vote_polls",
        }
        
        challenge_type = action_mapping.get(action_type)
        if not challenge_type:
            return
        
        challenge = self.db.query(DailyChallenge).filter(
            DailyChallenge.challenge_date == today,
            DailyChallenge.action_type == challenge_type,
            DailyChallenge.is_active == True
        ).first()
        
        if not challenge:
            return
        
        progress = self.db.query(UserChallengeProgress).filter(
            UserChallengeProgress.user_uid == user_uid,
            UserChallengeProgress.challenge_id == challenge.id
        ).first()
        
        if not progress:
            progress = UserChallengeProgress(
                user_uid=user_uid,
                challenge_id=challenge.id,
                progress=0,
                completed=False,
                claimed=False
            )
            self.db.add(progress)
        
        if not progress.completed:
            progress.progress = min(progress.progress + increment, challenge.target_count)
            progress.updated_at = datetime.now(timezone.utc)
            
            if progress.progress >= challenge.target_count and not progress.completed:
                progress.completed = True
                progress.completed_at = datetime.now(timezone.utc)
                
                # Send notification (can be implemented with push)
                logger.info(f"User {user_uid} completed daily challenge: {challenge.title}")
            
            self.db.commit()
    
    def claim_challenge_reward(self, user_uid: str, challenge_id: int) -> dict:
        """Claim reward for completed challenge"""
        progress = self.db.query(UserChallengeProgress).filter(
            UserChallengeProgress.user_uid == user_uid,
            UserChallengeProgress.challenge_id == challenge_id
        ).first()
        
        if not progress or not progress.completed or progress.claimed:
            return {"success": False, "message": "Challenge not available for claiming"}
        
        challenge = self.db.query(DailyChallenge).filter(
            DailyChallenge.id == challenge_id
        ).first()
        
        if not challenge:
            return {"success": False, "message": "Challenge not found"}
        
        # Check for fraud
        if self.fraud_detection.is_user_flagged(user_uid):
            return {"success": False, "message": "Account under review. Cannot claim reward."}
        
        # Award rewards
        self.rewards_service.add_points(
            user_uid, 
            challenge.reward_points, 
            f"Daily challenge: {challenge.title}",
            metadata={"type": "daily_challenge", "challenge_id": challenge_id}
        )
        self.rewards_service.add_coins(
            user_uid, 
            challenge.reward_coins, 
            f"Daily challenge coin reward",
            metadata={"type": "daily_challenge", "challenge_id": challenge_id}
        )
        
        progress.claimed = True
        self.db.commit()
        
        # Check for streak badge (optional)
        completed_count = self.db.query(UserChallengeProgress).filter(
            UserChallengeProgress.user_uid == user_uid,
            UserChallengeProgress.completed == True
        ).count()
        
        if completed_count == 7:
            self.rewards_service.award_badge(user_uid, "challenge_week")
        elif completed_count == 30:
            self.rewards_service.award_badge(user_uid, "challenge_month")
        
        return {
            "success": True,
            "points_earned": challenge.reward_points,
            "coins_earned": challenge.reward_coins
        }
    
    def get_or_create_weekly_bingo(self, user_uid: str) -> BingoCard:
        """Get or create bingo card for current week"""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        
        card = self.db.query(BingoCard).filter(
            BingoCard.user_uid == user_uid,
            BingoCard.week_start_date == week_start
        ).first()
        
        if not card:
            card = self._generate_bingo_card(user_uid, week_start)
            self.db.add(card)
            self.db.commit()
            self.db.refresh(card)
            logger.info(f"Generated new bingo card for user {user_uid}, week starting {week_start}")
        
        return card
    
    def _generate_bingo_card(self, user_uid: str, week_start: date) -> BingoCard:
        """Generate a 5x5 bingo card with random tasks"""
        
        easy_tasks = [t for t, config in RewardsConfig.BINGO_TASKS.items() 
                     if config.get("difficulty") == "easy" and t != "free_space"]
        medium_tasks = [t for t, config in RewardsConfig.BINGO_TASKS.items() 
                       if config.get("difficulty") == "medium"]
        hard_tasks = [t for t, config in RewardsConfig.BINGO_TASKS.items() 
                     if config.get("difficulty") == "hard"]
        
        # Create 5x5 grid
        grid = []
        used_tasks = set()
        
        for i in range(5):
            row = []
            for j in range(5):
                if i == 2 and j == 2:  # Center is FREE SPACE
                    row.append("free_space")
                else:
                    # Distribute difficulty based on position
                    if (i in [0, 1, 3, 4] and j in [0, 1, 3, 4]) or (i in [0,4] and j in [0,4]):
                        task_pool = easy_tasks
                    elif i in [0, 4] or j in [0, 4]:
                        task_pool = medium_tasks
                    else:
                        task_pool = hard_tasks
                    
                    # Get available tasks not used yet
                    available = [t for t in task_pool if t not in used_tasks]
                    if not available:
                        available = [t for t in easy_tasks if t not in used_tasks]
                        if not available:
                            available = easy_tasks
                    
                    task = random.choice(available)
                    used_tasks.add(task)
                    row.append(task)
            grid.append(row)
        
        return BingoCard(
            user_uid=user_uid,
            week_start_date=week_start,
            card_data=json.dumps({"grid": grid}),
            completed_cells=json.dumps([]),
            completed_lines=json.dumps([]),
            created_at=datetime.now(timezone.utc)
        )
    
    def update_bingo_progress(self, user_uid: str, action_type: str, value: int = 1, metadata: dict = None):
        """Update user's bingo progress based on actions"""
        card = self.get_or_create_weekly_bingo(user_uid)
        card_data = json.loads(card.card_data)
        grid = card_data["grid"]
        completed_cells = set(json.loads(card.completed_cells))
        
        updated = False
        
        for row_idx, row in enumerate(grid):
            for col_idx, task_key in enumerate(row):
                cell_key = f"{row_idx},{col_idx}"
                
                if cell_key in completed_cells:
                    continue
                
                task = RewardsConfig.BINGO_TASKS.get(task_key)
                if not task:
                    continue
                
                if self._matches_action(task, action_type, metadata):
                    completed_cells.add(cell_key)
                    updated = True
                    logger.debug(f"User {user_uid} completed bingo cell: {task_key} at {cell_key}")
        
        if updated:
            card.completed_cells = json.dumps(list(completed_cells))
            self._check_new_lines(card)
            card.updated_at = datetime.now(timezone.utc)
            self.db.commit()
    
    def _matches_action(self, task: dict, action_type: str, metadata: dict = None) -> bool:
        """Check if user action matches task requirement"""
        task_type = task.get("type")
        
        if task_type == "free":
            return True
        if task_type == "read" and action_type == "read":
            return True
        if task_type == "read_local" and action_type == "read" and metadata and metadata.get("is_local"):
            return True
        if task_type == "share" and action_type == "share":
            return True
        if task_type == "share_platform" and action_type == "share" and metadata and metadata.get("platform") == task.get("platform"):
            return True
        if task_type == "comment" and action_type == "comment":
            return True
        if task_type == "like" and action_type == "like":
            return True
        if task_type == "bookmark" and action_type == "bookmark":
            return True
        if task_type == "vote_poll" and action_type == "vote_poll":
            return True
        if task_type == "daily_quiz" and action_type == "daily_quiz":
            return True
        if task_type == "watch_short" and action_type == "watch_short":
            return True
        if task_type == "streak" and action_type == "streak":
            return True
        if task_type == "invite" and action_type == "invite":
            return True
        if task_type == "follow_category" and action_type == "follow_category":
            return True
        if task_type == "login_days" and action_type == "login":
            return True
        if task_type == "daily_challenge" and action_type == "daily_challenge":
            return True
        if task_type == "read_count" and action_type == "read":
            # Read count tasks need separate tracking
            return False
        
        return False
    
    def _check_new_lines(self, card: BingoCard):
        """Check if user has completed any new lines"""
        completed_cells = set(json.loads(card.completed_cells))
        completed_lines = set(json.loads(card.completed_lines))
        new_lines = []
        
        # Check rows (0-4)
        for row in range(5):
            cells = [f"{row},{col}" for col in range(5)]
            if all(cell in completed_cells for cell in cells):
                line_key = f"row_{row}"
                if line_key not in completed_lines:
                    new_lines.append(line_key)
        
        # Check columns (0-4)
        for col in range(5):
            cells = [f"{row},{col}" for row in range(5)]
            if all(cell in completed_cells for cell in cells):
                line_key = f"col_{col}"
                if line_key not in completed_lines:
                    new_lines.append(line_key)
        
        # Check main diagonal (0,0 to 4,4)
        diag1 = [f"{i},{i}" for i in range(5)]
        if all(cell in completed_cells for cell in diag1):
            if "diag_1" not in completed_lines:
                new_lines.append("diag_1")
        
        # Check anti-diagonal (0,4 to 4,0)
        diag2 = [f"{i},{4-i}" for i in range(5)]
        if all(cell in completed_cells for cell in diag2):
            if "diag_2" not in completed_lines:
                new_lines.append("diag_2")
        
        if new_lines:
            completed_lines.update(new_lines)
            card.completed_lines = json.dumps(list(completed_lines))
            
            # Award immediate rewards for each line
            for line in new_lines:
                self.rewards_service.add_points(
                    card.user_uid,
                    50,
                    f"Bingo line completed: {line}",
                    metadata={"type": "bingo_line", "line": line}
                )
            
            logger.info(f"User {card.user_uid} completed bingo lines: {new_lines}")
    
    def get_bingo_status(self, user_uid: str) -> dict:
        """Get user's current bingo card status"""
        card = self.get_or_create_weekly_bingo(user_uid)
        
        card_data = json.loads(card.card_data)
        grid = card_data["grid"]
        completed_cells = set(json.loads(card.completed_cells))
        completed_lines = json.loads(card.completed_lines)
        
        # Build display grid with task details
        display_grid = []
        for row_idx, row in enumerate(grid):
            display_row = []
            for col_idx, task_key in enumerate(row):
                task = RewardsConfig.BINGO_TASKS.get(task_key, {"name": task_key, "difficulty": "easy"})
                is_completed = f"{row_idx},{col_idx}" in completed_cells
                
                display_row.append({
                    "task_key": task_key,
                    "task_name": task.get("name", task_key),
                    "completed": is_completed,
                    "difficulty": task.get("difficulty", "easy"),
                    "position": {"row": row_idx, "col": col_idx}
                })
            display_grid.append(display_row)
        
        # Calculate progress
        total_cells = 25
        completed_cell_count = len(completed_cells)
        
        # Calculate reward
        lines_completed = len(completed_lines)
        base_reward = lines_completed * 50
        full_house_bonus = 500 if lines_completed >= 12 else 0
        potential_reward = base_reward + full_house_bonus
        
        # Get week range
        week_end = card.week_start_date + timedelta(days=6)
        days_remaining = (week_end - date.today()).days if week_end >= date.today() else 0
        
        return {
            "week_start": card.week_start_date.isoformat(),
            "week_end": week_end.isoformat(),
            "days_remaining": max(0, days_remaining),
            "grid": display_grid,
            "completed_lines": completed_lines,
            "lines_count": len(completed_lines),
            "progress": {
                "completed_cells": completed_cell_count,
                "total_cells": total_cells,
                "percentage": round(completed_cell_count / total_cells * 100, 1),
                "lines_completed": len(completed_lines),
                "max_possible_lines": 12
            },
            "potential_reward": potential_reward,
            "is_complete": card.completed_at is not None,
            "reward_claimed": card.reward_claimed
        }
    
    def claim_bingo_reward(self, user_uid: str) -> dict:
        """Claim reward for completing bingo"""
        card = self.get_or_create_weekly_bingo(user_uid)
        
        if card.reward_claimed:
            return {"success": False, "message": "Reward already claimed"}
        
        if card.completed_at is None:
            # Check if all lines are completed
            completed_lines = json.loads(card.completed_lines)
            if len(completed_lines) >= 12:  # All rows, columns, and diagonals
                card.completed_at = datetime.now(timezone.utc)
            else:
                return {"success": False, "message": f"Complete all lines first. You have {len(completed_lines)}/12 lines."}
        
        # Check for fraud
        if self.fraud_detection.is_user_flagged(user_uid):
            return {"success": False, "message": "Account under review. Cannot claim reward."}
        
        # Calculate reward
        lines_completed = len(json.loads(card.completed_lines))
        base_reward = lines_completed * 50
        full_house_bonus = 500 if lines_completed >= 12 else 0
        total_reward = base_reward + full_house_bonus
        
        # Award reward
        self.rewards_service.add_coins(
            user_uid, 
            total_reward, 
            "Weekly Bingo Card Completion!",
            metadata={"type": "bingo_complete", "lines": lines_completed}
        )
        self.rewards_service.award_badge(user_uid, "bingo_master")
        
        card.reward_claimed = True
        self.db.commit()
        
        logger.info(f"User {user_uid} claimed bingo reward: {total_reward} coins")
        
        return {
            "success": True,
            "reward_coins": total_reward,
            "lines_completed": lines_completed,
            "full_house": lines_completed >= 12
        }
    
    def get_challenge_leaderboard(self, limit: int = 50) -> list:
        """Get users with most daily challenge completions"""
        completions = self.db.query(
            UserChallengeProgress.user_uid,
            func.count(UserChallengeProgress.id).label('completions')
        ).filter(
            UserChallengeProgress.completed == True,
            UserChallengeProgress.claimed == True
        ).group_by(
            UserChallengeProgress.user_uid
        ).order_by(
            func.count(UserChallengeProgress.id).desc()
        ).limit(limit).all()
        
        return [
            {
                "user_uid": c.user_uid,
                "completions": c.completions
            }
            for c in completions
        ]
    
    def get_upcoming_challenges(self, user_uid: str, days: int = 7) -> list:
        """Get upcoming challenges for the next N days"""
        upcoming = []
        today = date.today()
        
        for i in range(1, days + 1):
            challenge_date = today + timedelta(days=i)
            challenge = self.db.query(DailyChallenge).filter(
                DailyChallenge.challenge_date == challenge_date,
                DailyChallenge.is_active == True
            ).first()
            
            if challenge:
                upcoming.append({
                    "date": challenge_date.isoformat(),
                    "title": challenge.title,
                    "description": challenge.description,
                    "reward_points": challenge.reward_points,
                    "reward_coins": challenge.reward_coins
                })
            else:
                upcoming.append({
                    "date": challenge_date.isoformat(),
                    "title": "Coming Soon",
                    "description": "Check back tomorrow for a new challenge!",
                    "reward_points": 0,
                    "reward_coins": 0
                })
        
        return upcoming