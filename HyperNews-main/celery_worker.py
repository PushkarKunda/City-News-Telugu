import logging
import os

from celery import Celery
from database import SessionLocal
from models.engagement import Notification
from models.user import User

logger = logging.getLogger(__name__)

_default_redis = "redis://localhost:6379/0"
_broker = os.getenv("CELERY_BROKER_URL", _default_redis)
_backend = os.getenv("CELERY_RESULT_BACKEND", _broker)

celery = Celery(
    "news_tasks",
    broker=_broker,
    backend=_backend,
)


@celery.task(name="send_news_notification")
def send_news_notification(news_uid: str, title: str) -> int:
    """Create in-app notifications for all users when news is approved."""
    db = SessionLocal()
    try:
        users = db.query(User.user_uid).all()
        notifications = [
            Notification(
                user_uid=user.user_uid,
                title=title,
                message=f"📰 New Update: {title}",
                link_url=f"/news/{news_uid}",
                notification_type="news",
            )
            for user in users
        ]
        if notifications:
            db.add_all(notifications)
            db.commit()
        return len(notifications)
    except Exception:
        logger.exception("send_news_notification failed news_uid=%s", news_uid)
        db.rollback()
        raise
    finally:
        db.close()