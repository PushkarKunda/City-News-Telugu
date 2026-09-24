# services/ranking_service.py
"""
Production Short-Form News Ranking & Feed Personalization Engine.
Implements:
1. Exponential Freshness Decay with customizable half-life
2. Logarithmic Engagement Scoring (views, likes, comments, shares)
3. Hierarchical Location Relevance (City > District > State)
4. User Category Affinity & Personalization
5. Breaking News Priority Boost with automatic expiration
6. Feed Diversity Penalties (prevents consecutive category/source monopolization)
7. Configurable Weights for dynamic tuning
"""
import math
from datetime import datetime, timezone
from typing import List, Dict, Optional, Set
from pydantic import BaseModel

from models.news import News
from models.user import UserPreference


class RankingWeights(BaseModel):
    """Configurable weights for news ranking algorithm."""
    weight_freshness: float = 0.35
    weight_engagement: float = 0.25
    weight_location: float = 0.20
    weight_category: float = 0.15
    weight_quality: float = 0.05

    # Freshness half-life in hours (every 12 hours without new engagement, freshness halves)
    freshness_half_life_hours: float = 12.0

    # Boosts and Penalties
    breaking_boost: float = 40.0
    duplicate_penalty: float = 50.0
    same_category_penalty: float = 15.0
    same_source_penalty: float = 20.0


# Default production weights
DEFAULT_RANKING_WEIGHTS = RankingWeights()


class NewsRankingService:
    """Calculates multidimensional ranking scores and diversifies news feeds."""

    def __init__(self, weights: Optional[RankingWeights] = None):
        self.weights = weights or DEFAULT_RANKING_WEIGHTS

    def compute_freshness_score(self, created_at: datetime, current_time: datetime) -> float:
        """
        Calculates exponential time-decay score between 0.0 and 100.0.
        Uses half-life formula: Score = 100 * (0.5 ^ (age_hours / half_life))
        """
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        age_hours = max(0.0, (current_time - created_at).total_seconds() / 3600.0)
        # Half-life decay
        decay_factor = math.pow(0.5, age_hours / self.weights.freshness_half_life_hours)
        return round(100.0 * decay_factor, 2)

    def compute_engagement_score(self, news: News) -> float:
        """
        Calculates sub-linear (log-scaled) engagement score (0.0 to 100.0).
        Logarithmic dampening prevents viral clickbait from dominating perpetually.
        """
        views = getattr(news, "views_count", 0) or 0
        likes = getattr(news, "likes_count", 0) or 0
        comments = getattr(news, "comments_count", 0) or 0
        shares = getattr(news, "shares_count", 0) or 0

        # Weighted interaction value
        raw_engagement = (views * 0.1) + (likes * 1.5) + (comments * 3.0) + (shares * 5.0)

        if raw_engagement <= 0:
            return 0.0

        # Log scale: log10(1 + raw) normalized to 100 (log10(10000) ~ 4.0)
        log_score = (math.log10(1.0 + raw_engagement) / 4.0) * 100.0
        return min(100.0, round(log_score, 2))

    def compute_location_score(self, news: News, user_pref: Optional[UserPreference]) -> float:
        """
        Hierarchical location relevance score:
        - Exact City match: 100.0
        - Same District match: 80.0
        - Same State match: 60.0
        - General / National: 30.0
        """
        if not user_pref:
            return 50.0  # Neutral

        news_city_id = getattr(news, "city_id", None)
        if not news_city_id:
            return 30.0  # National/general story

        if user_pref.city_id and news_city_id == user_pref.city_id:
            return 100.0

        # Check district and state via relationships if loaded
        if hasattr(news, "city") and news.city:
            news_district_id = getattr(news.city, "district_id", None)
            if user_pref.district_id and news_district_id and news_district_id == user_pref.district_id:
                return 80.0

            if hasattr(news.city, "district") and news.city.district:
                news_state_id = getattr(news.city.district, "state_id", None)
                if user_pref.state_id and news_state_id and news_state_id == user_pref.state_id:
                    return 60.0

        return 20.0

    def compute_category_score(self, news: News, user_pref: Optional[UserPreference]) -> float:
        """Calculates category affinity based on user selected categories."""
        if not user_pref or not user_pref.categories:
            return 50.0  # Neutral

        news_categories = getattr(news, "categories", [])
        if not news_categories:
            return 30.0

        user_cat_ids = {c.id for c in user_pref.categories}
        news_cat_ids = {c.id for c in news_categories}

        overlap = user_cat_ids & news_cat_ids
        if overlap:
            return 100.0
        return 20.0

    def calculate_score(
        self,
        news: News,
        user_pref: Optional[UserPreference],
        current_time: Optional[datetime] = None
    ) -> float:
        """Calculate composite ranking score for a single news story."""
        now = current_time or datetime.now(timezone.utc)

        freshness = self.compute_freshness_score(news.created_at, now)
        engagement = self.compute_engagement_score(news)
        location = self.compute_location_score(news, user_pref)
        category = self.compute_category_score(news, user_pref)
        quality = (getattr(news, "quality_score", None) or 1.0) * 100.0

        base_score = (
            (freshness * self.weights.weight_freshness) +
            (engagement * self.weights.weight_engagement) +
            (location * self.weights.weight_location) +
            (category * self.weights.weight_category) +
            (quality * self.weights.weight_quality)
        )

        # Breaking news boost (if active)
        if getattr(news, "is_breaking", False):
            expires_at = getattr(news, "breaking_expires_at", None)
            if expires_at:
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > now:
                    base_score += self.weights.breaking_boost
            else:
                base_score += self.weights.breaking_boost

        # Duplicate penalty (duplicates should not be promoted over canonicals)
        if getattr(news, "is_duplicate", False):
            base_score -= self.weights.duplicate_penalty

        return round(max(0.0, base_score), 2)

    def rank_and_diversify_feed(
        self,
        news_list: List[News],
        user_pref: Optional[UserPreference],
        current_time: Optional[datetime] = None
    ) -> List[News]:
        """
        Rank news list by score and apply greedy diversity filtering:
        Penalizes adjacent stories from the same publisher or category to maintain feed variety.
        """
        now = current_time or datetime.now(timezone.utc)

        # 1. Pre-calculate individual base scores
        scored_items = []
        for news in news_list:
            score = self.calculate_score(news, user_pref, now)
            news.ranking_score = score
            scored_items.append((score, news))

        # Sort by base score descending
        scored_items.sort(key=lambda x: x[0], reverse=True)

        if len(scored_items) <= 2:
            return [item[1] for item in scored_items]

        # 2. Greedy selection with diversity constraints
        final_feed: List[News] = []
        remaining = scored_items.copy()

        recent_categories: List[Set[int]] = []
        recent_sources: List[Optional[str]] = []

        while remaining:
            best_idx = 0
            best_penalized_score = -float("inf")

            for idx, (base_score, candidate) in enumerate(remaining[:10]):  # Lookahead window of 10
                penalized_score = base_score

                # Category diversity check (last 2 cards)
                cand_cats = {c.id for c in getattr(candidate, "categories", [])}
                if any(cand_cats & prev_cats for prev_cats in recent_categories[-2:]):
                    penalized_score -= self.weights.same_category_penalty

                # Source diversity check (last 2 cards)
                cand_source = getattr(candidate, "source_name", None)
                if cand_source and cand_source in recent_sources[-2:]:
                    penalized_score -= self.weights.same_source_penalty

                if penalized_score > best_penalized_score:
                    best_penalized_score = penalized_score
                    best_idx = idx

            selected_score, selected_news = remaining.pop(best_idx)
            final_feed.append(selected_news)

            # Update recent window
            recent_categories.append({c.id for c in getattr(selected_news, "categories", [])})
            recent_sources.append(getattr(selected_news, "source_name", None))

        return final_feed
