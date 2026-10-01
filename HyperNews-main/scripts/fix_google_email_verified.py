"""
One-time migration: mark email_verified=True for all Google-authenticated users.

Google Sign-In always implies the email is verified by Google.
Any existing users who signed in with Google but have email_verified=False
(because the fix wasn't deployed yet) are corrected here.

Run once:
    python scripts/fix_google_email_verified.py

Safe to run multiple times (idempotent).
"""
import sys
import os

# Allow running from either the project root or the scripts/ directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from datetime import datetime, timezone
from sqlalchemy import or_
from database import SessionLocal, init_db
from models.user import User


def run():
    init_db()
    db = SessionLocal()
    try:
        # Find all Google users where email_verified is False or email_verified_at is None
        google_users_unverified = db.query(User).filter(
            or_(
                User.google_id.isnot(None),
                User.auth_provider == "google",
                User.providers.like("%google%"),
            ),
            or_(
                User.email_verified == False,  # noqa: E712
                User.email_verified_at.is_(None),
            )
        ).all()

        if not google_users_unverified:
            print("No Google users needing email verification backfill. All accounts verified.")
            return

        print(f"Found {len(google_users_unverified)} Google user(s) needing email verification update. Fixing...")

        now = datetime.now(timezone.utc)
        for user in google_users_unverified:
            print(f"  user_uid={user.user_uid} | email={user.email} | google_id={user.google_id} | auth_provider={user.auth_provider}")
            user.email_verified = True
            if not user.email_verified_at:
                user.email_verified_at = now
            user.updated_at = now

        db.commit()
        print(f"Fixed {len(google_users_unverified)} user(s). email_verified=True and email_verified_at set for all Google accounts.")

    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
