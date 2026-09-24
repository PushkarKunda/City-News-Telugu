import os
import random
import string
import requests
from uuid import uuid4
from urllib.parse import urlparse
from bs4 import BeautifulSoup
import newspaper
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models.engagement import Notification
from models.news import News
from models.user import User

# -----------------------------------------------------------------------------
# 🔐 Password Utilities
# -----------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash for the given password."""
    return pwd_context.hash(password)

# -----------------------------------------------------------------------------
# 🆔 UID & OTP Generators
# -----------------------------------------------------------------------------
def generate_user_uid(db: Session) -> str:
    """Generate a unique 8-character alphanumeric user UID."""
    while True:
        uid = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not db.query(User).filter(User.user_uid == uid).first():
            return uid

def generate_guest_uid(length: int = 10) -> str:
    """Generate a random uppercase UUID substring for guest users."""
    return str(uuid4())[:length].upper()

def generate_news_uid(length: int = 6) -> str:
    """Generate a short unique ID for news items."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def generate_event_uid(length: int = 7) -> str:
    """Generate an uppercase alphanumeric UID for events."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_poll_uid(length: int = 7) -> str:
    """Generate a unique poll UID."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of specified length."""
    return ''.join(random.choices("0123456789", k=length))

# -----------------------------------------------------------------------------
# 👤 Username Generators
# -----------------------------------------------------------------------------
# def _random_username_prefix() -> str:
#     prefixes = [
#         "newsreader", "quicknews", "dailybuzz", "newsbuddy",
#         "headlinehub", "flashfeed", "alertnews", "bytebuzz"
#     ]
#     return random.choice(prefixes)

# def generate_username() -> str:
#     """Generate a random readable username."""
#     return f"{_random_username_prefix()}_{random.randint(1000, 9999)}"

# def generate_unique_username(db: Session) -> str:
#     """Generate a unique username that doesn't exist in the DB."""
#     for _ in range(10):
#         username = generate_username()
#         if not db.query(User).filter(User.user_name == username).first():
#             return username
#     raise Exception("Failed to generate a unique username after multiple attempts")
# utility.py - Update username generation functions

import random
import string
import time
from typing import Optional

def generate_username() -> str:
    """
    Generate a random readable username with max 18 characters.
    Examples: 'news_1234', 'quick_5678', 'daily_9012'
    """
    prefixes = [
        "news", "quick", "daily", "flash", "alert", 
        "byte", "head", "feed", "pulse", "rapid",
        "fresh", "prime", "smart", "fast", "live"
    ]
    
    prefix = random.choice(prefixes)
    suffix = random.randint(1000, 9999)
    username = f"{prefix}_{suffix}"
    
    # Ensure username is max 18 chars
    if len(username) > 18:
        # Truncate prefix if needed
        max_prefix_len = 18 - len(f"_{suffix}")
        prefix = prefix[:max_prefix_len]
        username = f"{prefix}_{suffix}"
    
    return username


def generate_unique_username(db: Session) -> str:
    """
    Generate a unique username that doesn't exist in the DB.
    Max length: 18 characters
    """
    # Try up to 20 times
    for attempt in range(20):
        username = generate_username()
        
        # Ensure max length
        if len(username) > 18:
            username = username[:18]
        
        # Check if username exists
        existing = db.query(User).filter(User.user_name == username).first()
        if not existing:
            return username
    
    # Fallback: timestamp-based username
    fallback = f"user_{int(time.time())}"[:18]
    
    # Make sure it's unique
    while db.query(User).filter(User.user_name == fallback).first():
        fallback = f"u{random.randint(1000, 9999)}"[:18]
    
    return fallback


def generate_short_username(prefix: Optional[str] = None) -> str:
    """
    Generate a short username with custom prefix (max 18 chars)
    Example: generate_short_username("john") -> 'john_12345'
    """
    if prefix:
        # Clean prefix: lowercase, remove spaces, max 12 chars
        clean_prefix = prefix.lower().replace(" ", "_")[:12]
        suffix = random.randint(10000, 99999)
        username = f"{clean_prefix}_{suffix}"
    else:
        # Random username
        username = generate_username()
    
    # Ensure max length
    if len(username) > 18:
        username = username[:18]
    
    return username
# -----------------------------------------------------------------------------
# 🌐 YouTube / Source Utilities
# -----------------------------------------------------------------------------
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

def extract_source_name(url: str) -> str:
    """Extract and format the source name from a given URL."""
    try:
        netloc = urlparse(url).netloc
        domain = netloc.replace("www.", "").split(".")[0]
        return domain.capitalize()
    except Exception:
        return "Unknown"

# -----------------------------------------------------------------------------
# 📰 Article Fetching Utilities
# -----------------------------------------------------------------------------
def fetch_article_text_and_image(url: str) -> dict:
    """
    Extract article text and image from a given news URL.
    Returns:
        {
            "text": "...",
            "image_url": "..."
        }
    """
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract text
        paragraphs = soup.find_all('p')
        article_text = ' '.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])

        # Extract image (OpenGraph)
        og_image = soup.find("meta", property="og:image")
        image_url = og_image["content"] if og_image and og_image.get("content") else None

        return {"text": article_text.strip(), "image_url": image_url}
    except Exception as e:
        print("Article parse error:", e)
        return {"text": "", "image_url": None}

def fetch_article_text(url: str) -> str:
    """Fetch and parse article text using newspaper3k."""
    article = newspaper.Article(url)
    article.download()
    article.parse()
    return article.text

# -----------------------------------------------------------------------------
# 🔔 Notification Utilities
# -----------------------------------------------------------------------------
def send_news_notifications(db: Session, news_title: str, news_uid: str) -> None:
    """Send a 'News Published' in-app notification to all users."""
    users = db.query(User).all()
    notifications = [
        Notification(
            user_uid=user.user_uid,
            title="📰 News Published",
            message=f'"{news_title}" has been published. Tap to read.',
            link_url=f"/news/{news_uid}",
            notification_type="news",
        )
        for user in users
    ]
    if notifications:
        db.add_all(notifications)
        db.commit()
# ====================================================
# 🔐 Password Hashing Configuration
# ====================================================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ====================================================
# 🎥 YouTube API Configuration
# ====================================================
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


# ====================================================
# 🧠 Common Utility Functions
# ====================================================

def extract_source_name(url: str) -> str:
    """
    Extracts and returns a clean, capitalized source name from a given URL.
    Example:
        https://www.bbc.com/news -> "Bbc"
    """
    netloc = urlparse(url).netloc
    domain = netloc.replace("www.", "").split(".")[0]
    return domain.capitalize()


def generate_otp() -> str:
    """
    Generates a random 4-digit OTP as a string.
    Example: '4827'
    """
    return str(random.randint(1000, 9999))


def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using bcrypt.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against its hashed version.
    """
    return pwd_context.verify(plain_password, hashed_password)
