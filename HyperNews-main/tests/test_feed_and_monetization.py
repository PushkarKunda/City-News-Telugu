# tests/test_feed_and_monetization.py
import pytest
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from models.news import News, Category
from models.user import User
from models.content import Advertisement, SponsoredPost
from models.monetization import AdEvent
from services.ad_service import MonetizationService, CLICK_COOLDOWN_SECONDS


def test_feed_guest_access(client: TestClient, db: Session):
    """Unauthenticated guest users must be able to view the news feed without receiving 401 or 404."""
    # Seed approved canonical news
    now = datetime.now(timezone.utc)
    for i in range(5):
        news = News(
            news_uid=f"guest_feed_news_{i}",
            title=f"Breaking Public Story Number {i} in National Headlines",
            summary="A short concise summary of public news events happening around the nation today.",
            language_id=1,
            user_uid="admin_uid_001",
            is_approved=1,
            is_duplicate=False,
            created_at=now - timedelta(minutes=i * 10),
        )
        db.add(news)
    db.commit()

    res = client.get("/v1/feed?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "metadata" in data
    assert len(data["items"]) >= 1


def test_feed_excludes_duplicates(client: TestClient, db: Session):
    """Duplicate news stories must be excluded from the feed."""
    now = datetime.now(timezone.utc)

    canonical = News(
        news_uid="canonical_story_feed",
        title="ISRO Lunar Mission lands safely on south pole",
        summary="Historic achievement as lander touches down safely.",
        language_id=1,
        user_uid="admin_uid_001",
        is_approved=1,
        is_duplicate=False,
        created_at=now,
    )
    duplicate = News(
        news_uid="duplicate_story_feed",
        title="Duplicate story that should be hidden from public feed",
        summary="This article is a duplicate and should not appear in user feed.",
        language_id=1,
        user_uid="admin_uid_001",
        is_approved=1,
        is_duplicate=True,  # MARKED AS DUPLICATE
        duplicate_score=0.98,
        canonical_story_id="canonical_story_feed",
        created_at=now,
    )
    db.add_all([canonical, duplicate])
    db.commit()

    res = client.get("/v1/feed?limit=20")
    assert res.status_code == 200
    item_uids = [
        item["data"]["news_uid"]
        for item in res.json()["items"]
        if item.get("type") == "news" and "news_uid" in item.get("data", {})
    ]

    assert "canonical_story_feed" in item_uids
    assert "duplicate_story_feed" not in item_uids


def test_feed_new_alias_compatibility(client: TestClient):
    """The /v1/feed_new alias must return 200 with the identical feed format."""
    res = client.get("/v1/feed_new?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "metadata" in data


def test_ad_interleaving():
    """MonetizationService must interleave ads and sponsored posts at configured frequency intervals."""
    service = MonetizationService(db=None)

    news_items = [{"type": "news", "id": i} for i in range(15)]
    ad_configs = [{"id": 1, "network": "admob", "ad_unit_id": "ca-app-pub-123"}]
    sponsored_posts = [{"id": 101, "brand_name": "Acme Corp", "is_sponsored": True}]

    mixed = service.interleave_ads_in_feed(
        news_items=news_items,
        ad_configs=ad_configs,
        sponsored_posts=sponsored_posts,
        frequency_interval=5
    )

    # 15 news items with frequency 5: ads inserted after item 5 and item 10 -> total 17 items
    assert len(mixed) == 17
    # Position 5 (index 5) should be commercial content
    assert mixed[5]["type"] in ["ad", "sponsored"]
    assert mixed[11]["type"] in ["ad", "sponsored"]


def test_ad_click_anti_fraud_cooldown(db: Session, regular_user: User):
    """Repeated rapid clicks on the same ad within cooldown must be detected as duplicate/fraudulent."""
    service = MonetizationService(db=db)

    # First click: accepted
    click1 = service.track_click(
        campaign_id=10,
        user_uid=regular_user.user_uid,
        ip_address="198.51.100.1",
        user_agent="Mozilla/5.0"
    )
    assert click1["status"] == "recorded"
    assert click1["is_duplicate"] is False

    # Immediate second click: flagged as duplicate
    click2 = service.track_click(
        campaign_id=10,
        user_uid=regular_user.user_uid,
        ip_address="198.51.100.1",
        user_agent="Mozilla/5.0"
    )
    assert click2["status"] == "duplicate_ignored"
    assert click2["is_duplicate"] is True
