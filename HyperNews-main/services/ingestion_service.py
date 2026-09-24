# services/ingestion_service.py
"""
Automated News Ingestion Pipeline for HyperNews.
Features:
1. Ingests from RSS/Atom feeds and JSON APIs using feedparser & httpx
2. HTML cleaning & short-form text normalization
3. Integrated duplicate detection & story clustering
4. Source reliability scoring & automated moderation routing
5. Resilient batch processing with error isolation per source
"""
import re
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
import feedparser
import httpx
from sqlalchemy.orm import Session

from models.source import NewsSource
from models.news import News, Category
from models.user import User
from services.duplicate_detection_service import DuplicateDetectionService, normalize_url
from utility import generate_news_uid

logger = logging.getLogger(__name__)


def clean_html_content(raw_html: str) -> str:
    """Strip HTML tags, scripts, and extra whitespaces."""
    if not raw_html:
        return ""
    try:
        soup = BeautifulSoup(raw_html, "html.parser")
        # Remove script and style elements
        for script in soup(["script", "style", "iframe"]):
            script.decompose()
        text = soup.get_text(separator=" ")
        return re.sub(r"\s+", " ", text).strip()
    except Exception:
        clean = re.sub(r"<[^>]+>", "", raw_html)
        return re.sub(r"\s+", " ", clean).strip()


def extract_image_url(entry: Any) -> Optional[str]:
    """Extract thumbnail/media image URL from RSS entry."""
    # Check media_content
    if hasattr(entry, "media_content") and entry.media_content:
        for media in entry.media_content:
            if media.get("url") and ("image" in media.get("type", "") or media.get("medium") == "image"):
                return media["url"]

    # Check media_thumbnail
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        return entry.media_thumbnail[0].get("url")

    # Check enclosures
    if hasattr(entry, "enclosures") and entry.enclosures:
        for enc in entry.enclosures:
            if "image" in enc.get("type", ""):
                return enc.get("href") or enc.get("url")

    # Check img tags inside summary
    summary_html = getattr(entry, "summary", "") or getattr(entry, "description", "")
    if summary_html and "<img" in summary_html:
        try:
            soup = BeautifulSoup(summary_html, "html.parser")
            img = soup.find("img")
            if img and img.get("src"):
                return img["src"]
        except Exception:
            pass

    return None


class IngestionService:
    """Manages periodic or on-demand feed fetching and ingestion into the database."""

    def __init__(self, db: Session, default_system_user_uid: str = "SYSADMIN"):
        self.db = db
        self.system_user_uid = default_system_user_uid
        self.duplicate_service = DuplicateDetectionService(db)

    def ingest_source(self, source: NewsSource, max_entries: int = 15) -> Dict[str, Any]:
        """Fetch and process articles from a single NewsSource."""
        now = datetime.now(timezone.utc)
        results = {
            "source_id": source.id,
            "source_name": source.name,
            "fetched": 0,
            "ingested": 0,
            "duplicates": 0,
            "skipped": 0,
            "error": None
        }

        # Ensure a system author exists in database
        author = self.db.query(User).filter(User.user_uid == self.system_user_uid).first()
        if not author:
            # Fallback to any admin user
            admin_user = self.db.query(User).filter(User.role >= 5).first()
            if admin_user:
                author_uid = admin_user.user_uid
            else:
                author_uid = "ADMIN001"
        else:
            author_uid = author.user_uid

        try:
            logger.info("Fetching RSS feed for %s: %s", source.name, source.feed_url)
            # Use httpx with 15s timeout to fetch content safely
            headers = {"User-Agent": "HyperNews-Bot/2.0 (+https://hypernews.com)"}
            with httpx.Client(timeout=15.0, follow_redirects=True, headers=headers) as client:
                response = client.get(source.feed_url)
                response.raise_for_status()
                feed_data = feedparser.parse(response.text)

            entries = feed_data.entries[:max_entries]
            results["fetched"] = len(entries)

            for entry in entries:
                title = clean_html_content(getattr(entry, "title", "")).strip()
                raw_summary = getattr(entry, "summary", "") or getattr(entry, "description", "")
                summary = clean_html_content(raw_summary).strip()
                source_link = getattr(entry, "link", None)

                if not title or len(title) < 10:
                    results["skipped"] += 1
                    continue

                # Short-form summary formatting (Inshorts style ~ 350-500 chars)
                if not summary or len(summary) < 50:
                    summary = title
                elif len(summary) > 600:
                    summary = summary[:597] + "..."

                image_url = extract_image_url(entry)

                # Check for duplicates using the Duplicate Detection Pipeline
                dup_result = self.duplicate_service.check_duplicate(
                    title=title,
                    summary=summary,
                    language_id=source.default_language_id,
                    source_url=source_link
                )

                if dup_result.is_duplicate and dup_result.duplicate_score >= 0.95:
                    # Exact duplicate already in database, skip insertion to prevent spam
                    results["duplicates"] += 1
                    continue

                # Prepare approval status based on source reliability
                is_auto_approve = bool(source.auto_publish and (source.reliability_score or 0.8) >= 0.90)
                approved_status = 1 if is_auto_approve else 0

                # Create News entry
                news_uid = generate_news_uid(self.db)
                news = News(
                    news_uid=news_uid,
                    title=title,
                    summary=summary,
                    image_url=image_url,
                    language_id=source.default_language_id,
                    is_approved=approved_status,
                    is_auto_generated=True,
                    source_url=source_link,
                    source_name=source.name,
                    source_id=source.id,
                    cluster_id=dup_result.cluster_id,
                    canonical_story_id=dup_result.canonical_story_id,
                    is_duplicate=dup_result.is_duplicate,
                    duplicate_score=dup_result.duplicate_score,
                    quality_score=source.reliability_score or 0.85,
                    user_uid=author_uid,
                    created_at=now
                )

                # Attach default category if configured
                if source.default_category_id:
                    cat = self.db.query(Category).filter(Category.id == source.default_category_id).first()
                    if cat:
                        news.categories = [cat]

                self.db.add(news)
                results["ingested"] += 1

            source.last_fetched_at = now
            source.fetch_status = "success"
            source.last_error = None
            source.articles_ingested_count = (source.articles_ingested_count or 0) + results["ingested"]
            self.db.commit()

        except Exception as exc:
            self.db.rollback()
            source.last_fetched_at = now
            source.fetch_status = "error"
            source.last_error = str(exc)
            self.db.commit()
            results["error"] = str(exc)
            logger.error("Error ingesting from source %s: %s", source.name, exc)

        return results

    def ingest_all_active_sources(self) -> List[Dict[str, Any]]:
        """Run batch ingestion across all active news sources."""
        sources = self.db.query(NewsSource).filter(NewsSource.is_active == True).all()
        batch_results = []
        for src in sources:
            res = self.ingest_source(src)
            batch_results.append(res)
        return batch_results
