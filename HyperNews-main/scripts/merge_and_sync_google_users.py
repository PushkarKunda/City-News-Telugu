"""
scripts/merge_and_sync_google_users.py
Idempotent script to:
1. Merge duplicate accounts: If multiple backend user rows share the same email,
   keeps the primary account, redirects all foreign key references to it, and deletes duplicates.
2. Backfill Google data: For users whose Firebase account has 'google.com' (or whose email
   matches a Google account), sets google_id, auth_provider='google', providers=['google'],
   email_verified=True, and email_verified_at=now.
"""
import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal, init_db, ensure_user_columns
from models.user import User
from services.firebase_auth import init_firebase
from sqlalchemy import func, text

try:
    from firebase_admin import auth as fb_auth
    HAS_FB_ADMIN = True
except ImportError:
    HAS_FB_ADMIN = False


def merge_and_sync():
    ensure_user_columns()
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    
    print("=== STEP 1: MERGE DUPLICATE USER ROWS BY EMAIL ===")
    # Find all emails with > 1 user row
    email_counts = (
        db.query(func.lower(User.email), func.count(User.id))
        .filter(User.email.isnot(None), User.email != "")
        .group_by(func.lower(User.email))
        .having(func.count(User.id) > 1)
        .all()
    )

    merged_duplicates_count = 0
    for email_lower, count in email_counts:
        users = (
            db.query(User)
            .filter(func.lower(User.email) == email_lower)
            .order_by(
                User.google_id.isnot(None).desc(),
                User.firebase_uid.isnot(None).desc(),
                (User.role > 1).desc(),
                User.created_at.asc()
            )
            .all()
        )

        primary = users[0]
        duplicates = users[1:]

        print(f"Merging {len(duplicates)} duplicate(s) for email '{email_lower}' into primary user {primary.user_uid}...")

        child_tables = [
            ("news", "user_uid"),
            ("news", "approved_by_uid"),
            ("news", "rejected_by_uid"),
            ("posts", "user_uid"),
            ("posts", "edited_by_uid"),
            ("post_likes", "user_uid"),
            ("post_comments", "user_uid"),
            ("news_comments", "user_uid"),
            ("news_likes", "user_uid"),
            ("news_views", "user_uid"),
            ("news_shares", "user_uid"),
            ("bookmarks", "user_uid"),
            ("follows", "follower_uid"),
            ("follows", "following_uid"),
            ("user_rewards", "user_uid"),
            ("reward_transactions", "user_uid"),
            ("user_activities", "user_uid"),
            ("device_tokens", "user_uid"),
            ("user_preferences", "user_uid"),
        ]

        for dup in duplicates:
            # Copy missing metadata to primary
            if not primary.phone and dup.phone:
                primary.phone = dup.phone
                primary.mobile_verified = dup.mobile_verified
            if not primary.name and dup.name:
                primary.name = dup.name
            if not primary.profile_picture and dup.profile_picture:
                primary.profile_picture = dup.profile_picture
            if not primary.gender and dup.gender:
                primary.gender = dup.gender
            if not primary.date_of_birth and dup.date_of_birth:
                primary.date_of_birth = dup.date_of_birth
            if not primary.google_id and dup.google_id:
                primary.google_id = dup.google_id
            if not primary.firebase_uid and dup.firebase_uid:
                primary.firebase_uid = dup.firebase_uid
            if dup.role > primary.role:
                primary.role = dup.role

            # Re-point foreign keys
            for table_name, col_name in child_tables:
                try:
                    stmt = text(f"UPDATE {table_name} SET {col_name} = :p_uid WHERE {col_name} = :d_uid")
                    db.execute(stmt, {"p_uid": primary.user_uid, "d_uid": dup.user_uid})
                except Exception:
                    # Ignore tables that might not exist in SQLite dev
                    pass

            db.delete(dup)
            merged_duplicates_count += 1

        db.commit()

    print(f"Duplicate cleanup complete: merged and removed {merged_duplicates_count} duplicate user records.")

    print("\n=== STEP 2: BACKFILL GOOGLE PROVIDER & EMAIL VERIFIED ===")
    firebase_google_map = {}
    if HAS_FB_ADMIN:
        try:
            app = init_firebase()
            if app:
                page = fb_auth.list_users()
                while page:
                    for fb_user in page.users:
                        has_google = any(p.provider_id == "google.com" for p in fb_user.provider_data)
                        g_id = next((p.uid for p in fb_user.provider_data if p.provider_id == "google.com"), fb_user.uid)
                        if has_google:
                            if fb_user.email:
                                firebase_google_map[fb_user.email.lower()] = {
                                    "uid": fb_user.uid,
                                    "google_id": g_id,
                                    "email": fb_user.email,
                                }
                            firebase_google_map[fb_user.uid] = {
                                "uid": fb_user.uid,
                                "google_id": g_id,
                                "email": fb_user.email,
                            }
                    page = page.get_next_page()
                print(f"Retrieved {len(firebase_google_map)} Google users from Firebase.")
        except Exception as e:
            print(f"Firebase listing skipped or unavailable: {e}")

    # Backfill database users
    users = db.query(User).all()
    updated_count = 0

    for user in users:
        updated = False
        fb_info = None
        if user.email and user.email.lower() in firebase_google_map:
            fb_info = firebase_google_map[user.email.lower()]
        elif user.firebase_uid and user.firebase_uid in firebase_google_map:
            fb_info = firebase_google_map[user.firebase_uid]

        is_google = bool(fb_info or user.google_id or user.auth_provider == "google")

        if fb_info:
            if not user.google_id:
                user.google_id = fb_info["google_id"]
                updated = True
            if not user.firebase_uid:
                user.firebase_uid = fb_info["uid"]
                updated = True

        if is_google:
            if user.auth_provider != "google":
                user.auth_provider = "google"
                updated = True

            # Parse and update providers list
            plist = []
            if user.providers:
                try:
                    p = json.loads(user.providers)
                    plist = p if isinstance(p, list) else [p]
                except Exception:
                    plist = [x.strip() for x in user.providers.split(",") if x.strip()]
            if "google" not in plist:
                plist.append("google")
                user.providers = json.dumps(sorted(list(set(plist))))
                updated = True

            # Mark email verified
            if not user.email_verified:
                user.email_verified = True
                user.email_verified_at = now
                updated = True
            elif hasattr(user, "email_verified_at") and user.email_verified_at is None:
                user.email_verified_at = now
                updated = True

        if updated:
            user.updated_at = now
            updated_count += 1

    db.commit()
    print(f"Backfill complete: updated {updated_count} user records with google_id, auth_provider='google', providers, and email_verified=True.")
    db.close()


if __name__ == "__main__":
    merge_and_sync()
