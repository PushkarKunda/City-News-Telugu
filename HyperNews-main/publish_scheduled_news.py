# tasks/publish_scheduled_news.py

import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models.news import ScheduledNews, News, Category
from utility import generate_news_uid

async def publish_scheduled_news():
    """Background task to publish scheduled news"""
    while True:
        try:
            db = SessionLocal()
            now = datetime.now(timezone.utc)
            
            # Find news ready to publish
            scheduled = db.query(ScheduledNews).filter(
                ScheduledNews.status == "pending",
                ScheduledNews.scheduled_at <= now
            ).all()
            
            for s in scheduled:
                try:
                    # Create actual news article
                    new_news = News(
                        news_uid=s.news_uid,
                        title=s.title,
                        summary=s.summary,
                        image_url=s.image_url,
                        language_id=s.language_id,
                        user_uid=s.user_uid,
                        city_id=s.city_id,
                        source_url=s.source_url,
                        source_name=s.source_name,
                        is_approved=1,
                        created_at=now
                    )
                    
                    # Attach categories
                    if s.categories:
                        new_news.categories = s.categories
                    
                    db.add(new_news)
                    
                    # Update scheduled record
                    s.status = "published"
                    s.published_at = now
                    
                    db.commit()
                    
                except Exception as e:
                    s.status = "failed"
                    db.commit()
                    print(f"Failed to publish scheduled news {s.id}: {str(e)}")
            
            db.close()
            
        except Exception as e:
            print(f"Scheduler error: {str(e)}")
        
        # Check every minute
        await asyncio.sleep(60)