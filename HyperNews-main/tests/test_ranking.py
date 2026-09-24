# tests/test_ranking.py
import pytest
from datetime import datetime, timezone, timedelta

from models.news import News, Category
from models.user import UserPreference
from services.ranking_service import NewsRankingService, RankingWeights


def test_freshness_decay():
    """Verify half-life exponential freshness decay score."""
    service = NewsRankingService(RankingWeights(freshness_half_life_hours=12.0))
    now = datetime.now(timezone.utc)

    score_brand_new = service.compute_freshness_score(now, now)
    assert score_brand_new == 100.0

    # At half-life (12 hours), score should be approximately 50.0
    score_12h = service.compute_freshness_score(now - timedelta(hours=12), now)
    assert 48.0 <= score_12h <= 52.0

    # At 24 hours (2 half-lives), score should be approximately 25.0
    score_24h = service.compute_freshness_score(now - timedelta(hours=24), now)
    assert 23.0 <= score_24h <= 27.0


def test_logarithmic_engagement_scaling():
    """Verify logarithmic engagement dampens extreme outlier numbers."""
    service = NewsRankingService()

    news_low = News(news_uid="low", views_count=10, likes_count=2, comments_count=0, shares_count=0)
    news_med = News(news_uid="med", views_count=1000, likes_count=100, comments_count=20, shares_count=10)
    news_viral = News(news_uid="viral", views_count=100000, likes_count=10000, comments_count=2000, shares_count=1000)

    score_low = service.compute_engagement_score(news_low)
    score_med = service.compute_engagement_score(news_med)
    score_viral = service.compute_engagement_score(news_viral)

    assert 0.0 < score_low < score_med < score_viral <= 100.0
    # Viral engagement is 100x medium, but log score must increase moderately, not 100x
    assert (score_viral / score_med) < 3.0


def test_location_hierarchical_scoring():
    """Verify City > District > State > Neutral location hierarchy."""
    service = NewsRankingService()

    pref = UserPreference(city_id=1, district_id=1, state_id=1)

    news_city = News(news_uid="city_match", city_id=1)
    news_other_city = News(news_uid="other_city", city_id=999)
    news_national = News(news_uid="national", city_id=None)

    score_city = service.compute_location_score(news_city, pref)
    score_other = service.compute_location_score(news_other_city, pref)
    score_nat = service.compute_location_score(news_national, pref)

    assert score_city == 100.0
    assert score_city > score_nat > score_other


def test_breaking_news_boost():
    """Breaking news articles should receive a score boost when active."""
    service = NewsRankingService()
    now = datetime.now(timezone.utc)

    normal_news = News(news_uid="norm", created_at=now, views_count=10, is_breaking=False)
    breaking_news = News(
        news_uid="brk",
        created_at=now,
        views_count=10,
        is_breaking=True,
        breaking_expires_at=now + timedelta(hours=2),
    )

    score_norm = service.calculate_score(normal_news, None, now)
    score_brk = service.calculate_score(breaking_news, None, now)

    assert score_brk > score_norm
    assert (score_brk - score_norm) >= 20.0


def test_feed_diversification():
    """Greedy diversification should prevent multiple adjacent stories from the exact same source."""
    service = NewsRankingService()
    now = datetime.now(timezone.utc)

    # Create 5 stories from Source A and 2 stories from Source B
    candidates = [
        News(news_uid=f"a_{i}", source_name="TimesOfIndia", created_at=now - timedelta(minutes=i*5), views_count=100-i)
        for i in range(5)
    ] + [
        News(news_uid=f"b_{i}", source_name="TheHindu", created_at=now - timedelta(minutes=i*6), views_count=95-i)
        for i in range(2)
    ]

    feed = service.rank_and_diversify_feed(candidates, None, now)

    assert len(feed) == len(candidates)
    # The first two stories in the diversified feed should not be dominated purely by TimesOfIndia
    sources = [n.source_name for n in feed]
    # Check that TheHindu appears early in the top items
    assert "TheHindu" in sources[:3]
