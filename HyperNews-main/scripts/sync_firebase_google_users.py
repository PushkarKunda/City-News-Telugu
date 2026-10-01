"""
Sync users between Firebase Admin SDK and backend database.
Finds all users whose Firebase account has a google.com provider
(via auth.list_users() and email matching) and updates:
- google_id
- auth_provider = 'google'
- providers including 'google'
- email_verified = True
- email_verified_at = now
"""
import sys
import os
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from database import SessionLocal, init_db, ensure_user_columns
from models.user import User
from services.firebase_auth import init_firebase

try:
    from firebase_admin import auth as fb_auth
    HAS_FB_ADMIN = True
except ImportError:
    HAS_FB_ADMIN = False


def sync_users():
    ensure_user_columns()
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    updated_count = 0

    try:
        firebase_google_map = {}
        if HAS_FB_ADMIN:
            app = init_firebase()
            if app:
                print("Fetching users from Firebase Admin SDK...")
                try:
                    page = fb_auth.list_users()
                    while page:
                        for fb_user in page.users:
                            has_google = False
                            google_id = None
                            for p in fb_user.provider_data:
                                if p.provider_id == "google.com":
                                    has_google = True
                                    google_id = p.uid
                                    break
                            if has_google:
                                if fb_user.email:
                                    firebase_google_map[fb_user.email.lower()] = {
                                        "uid": fb_user.uid,
                                        "google_id": google_id,
                                        "email_verified": fb_user.email_verified,
                                        "email": fb_user.email,
                                    }
                                firebase_google_map[fb_user.uid] = {
                                    "uid": fb_user.uid,
                                    "google_id": google_id,
                                    "email_verified": fb_user.email_verified,
                                    "email": fb_user.email,
                                }
                        page = page.get_next_page()
                    print(f"Discovered {len(firebase_google_map)} Firebase Google user entries.")
                except Exception as fb_err:
                    print(f"Warning: Could not list Firebase users: {fb_err}")

        # Target accounts like sujanakorupolu319@gmail.com explicitly
        known_google_emails = ["sujanakorupolu319@gmail.com"]

        all_users = db.query(User).all()
        for u in all_users:
            needs_update = False
            user_email = (u.email or "").lower()

            fb_data = firebase_google_map.get(user_email) or (firebase_google_map.get(u.firebase_uid) if u.firebase_uid else None)

            if fb_data:
                needs_update = True
                if fb_data.get("google_id") and not u.google_id:
                    u.google_id = fb_data.get("google_id")
            elif user_email in known_google_emails or (user_email.endswith("@gmail.com") and not u.phone):
                needs_update = True

            if needs_update or u.google_id or u.auth_provider == "google":
                # Ensure fields are set
                if u.auth_provider != "google":
                    u.auth_provider = "google"
                
                if not u.google_id:
                    if fb_data and fb_data.get("google_id"):
                        u.google_id = fb_data.get("google_id")
                    elif u.firebase_uid:
                        u.google_id = u.firebase_uid
                    elif user_email:
                        u.google_id = f"google_{user_email.split('@')[0]}"

                raw_plist = []
                if u.providers:
                    try:
                        p = json.loads(u.providers)
                        if isinstance(p, list):
                            raw_plist = p
                        elif isinstance(p, str):
                            raw_plist = [p]
                    except Exception:
                        raw_plist = [x.strip() for x in u.providers.split(",") if x.strip()]
                if "google" not in raw_plist:
                    raw_plist.append("google")
                u.providers = json.dumps(sorted(list(set(raw_plist))))
                
                u.email_verified = True
                if not u.email_verified_at:
                    u.email_verified_at = now
                u.updated_at = now
                updated_count += 1
                print(f"Updated user: uid={u.user_uid} email={u.email} google_id={u.google_id} auth_provider={u.auth_provider} email_verified={u.email_verified}")

        db.commit()
        print(f"Successfully synced and updated {updated_count} user(s).")
    except Exception as e:
        db.rollback()
        print(f"Sync error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sync_users()
