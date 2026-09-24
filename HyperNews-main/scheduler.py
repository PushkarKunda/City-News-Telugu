import logging
import os
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from database import SessionLocal
from models.engagement import Notification
from models.news import News, ScheduledNews
from utility import generate_news_uid

logger = logging.getLogger(__name__)

UTC = timezone.utc


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _notification_retention_hours() -> int:
    return int(os.getenv("NOTIFICATION_RETENTION_HOURS", "12"))


def delete_old_rejected_news() -> None:
    """Delete news rejected for more than 2 days."""
    db: Session = SessionLocal()
    try:
        cutoff = _utcnow() - timedelta(days=2)
        q = db.query(News).filter(
            News.is_approved == 2,
            News.rejected_at.isnot(None),
            News.rejected_at <= cutoff,
        )
        count = q.count()
        q.delete(synchronize_session=False)
        db.commit()
        if count:
            logger.info("Deleted %s rejected news rows older than 2 days.", count)
    except Exception:
        logger.exception("delete_old_rejected_news failed")
        db.rollback()
    finally:
        db.close()



def purge_old_notifications() -> None:
    """Purge notifications older than retention limit."""
    db: Session = SessionLocal()
    try:
        cutoff = _utcnow() - timedelta(hours=_notification_retention_hours())
        q = db.query(Notification).filter(Notification.created_at < cutoff)
        count = q.count()
        q.delete(synchronize_session=False)
        db.commit()
        if count:
            logger.info("Purged %s notifications older than retention.", count)
    except Exception:
        logger.exception("purge_old_notifications failed")
        db.rollback()
    finally:
        db.close()


def publish_scheduled_news() -> None:
    """Auto-publish news whose scheduled publication time has arrived."""
    db: Session = SessionLocal()
    try:
        now = _utcnow()
        items = (
            db.query(ScheduledNews)
            .filter(
                ScheduledNews.status == "pending",
                ScheduledNews.scheduled_at <= now,
            )
            .all()
        )
        if items:
            for item in items:
                published = News(
                    news_uid=generate_news_uid(),
                    title=item.title,
                    summary=item.summary,
                    image_url=item.image_url,
                    language_id=item.language_id,
                    user_uid=item.user_uid,
                    city_id=item.city_id,
                    source_url=item.source_url,
                    source_name=item.source_name,
                    is_approved=1,
                    status="published",
                    created_at=now
                )
                if item.categories:
                    published.categories = list(item.categories)
                db.add(published)
                item.status = "published"
                item.published_at = now
            db.commit()
            logger.info("Auto-published %s scheduled news articles.", len(items))
    except Exception:
        logger.exception("publish_scheduled_news failed")
        db.rollback()
    finally:
        db.close()


def periodic_source_ingestion() -> None:
    """Ingest feeds from active news sources according to their fetch frequency."""
    import asyncio
    db: Session = SessionLocal()
    try:
        from models.source import NewsSource
        from services.ingestion_service import IngestionService

        sources = db.query(NewsSource).filter(NewsSource.is_active.is_(True)).all()
        now = _utcnow()
        for source in sources:
            should_fetch = False
            if not source.last_fetched_at:
                should_fetch = True
            elif source.last_fetched_at + timedelta(minutes=source.fetch_frequency_minutes) <= now:
                should_fetch = True

            if should_fetch:
                try:
                    asyncio.run(IngestionService.ingest_from_source(db, source))
                except Exception:
                    logger.exception("Failed to ingest from source %s (%s)", source.id, source.name)
    except Exception:
        logger.exception("periodic_source_ingestion failed")
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(delete_old_rejected_news, "interval", minutes=10, id="delete_old_rejected_news")
scheduler.add_job(purge_old_notifications, "interval", hours=6, id="purge_old_notifications")
scheduler.add_job(publish_scheduled_news, "interval", minutes=1, id="publish_scheduled_news")
scheduler.add_job(periodic_source_ingestion, "interval", minutes=15, id="periodic_source_ingestion")


def start_notification_cleaner() -> None:
    """Start APScheduler jobs (idempotent)."""
    if scheduler.running:
        logger.debug("Scheduler already running; skip start.")
        return
    scheduler.start()
    logger.info("Scheduler started (cleanup, notification retention, scheduled news, feed ingestion).")

