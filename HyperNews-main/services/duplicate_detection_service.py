# services/duplicate_detection_service.py
"""
Production Duplicate News Detection and Story Clustering Service.
Combines:
1. URL canonicalization & domain normalization
2. Title & content text normalization (multilingual stopword removal)
3. 64-bit SimHash fingerprinting for fast near-duplicate detection
4. N-gram TF-IDF cosine similarity for lexical/semantic comparison
5. Clustering engine assigning `cluster_id`, `canonical_story_id`, and `duplicate_score`
"""
import re
import math
import hashlib
import unicodedata
from typing import List, Dict, Optional, Tuple, Set
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs, urlunparse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from models.news import News

# Common multilingual stopwords (English, Hindi, Telugu transliterations, generic news terms)
STOPWORDS: Set[str] = {
    # English
    "a", "an", "the", "and", "or", "but", "if", "because", "as", "what",
    "which", "this", "that", "these", "those", "then", "just", "so", "than",
    "such", "both", "through", "about", "for", "is", "of", "while", "during",
    "to", "from", "in", "out", "on", "off", "again", "further", "then", "once",
    "here", "there", "when", "where", "why", "how", "all", "any", "both", "each",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only",
    "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just",
    "don", "should", "now", "says", "said", "reported", "breaking", "news",
    "latest", "today", "yesterday", "update", "updates", "live", "watch",
    # Hindi/Telugu transliterations
    "hai", "aur", "ki", "ko", "se", "par", "me", "mein", "ka", "ke", "kya",
    "kare", "gaya", "gayi", "ani", "undi", "unnaru", "chesaru", "lo", "ku"
}


def normalize_url(url: Optional[str]) -> Optional[str]:
    """Clean and canonicalize URLs, stripping tracking parameters like utm_*, fbclid."""
    if not url:
        return None
    try:
        parsed = urlparse(url.strip())
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]

        # Strip marketing query parameters
        qs = parse_qs(parsed.query)
        cleaned_qs = {
            k: v for k, v in qs.items()
            if not k.lower().startswith(("utm_", "fbclid", "gclid", "ref", "source"))
        }
        # Rebuild query
        query_str = "&".join(f"{k}={v[0]}" for k, v in sorted(cleaned_qs.items()))
        path = parsed.path.rstrip("/")

        return urlunparse((parsed.scheme.lower(), netloc, path, "", query_str, ""))
    except Exception:
        return url.strip().lower()


def normalize_text(text: str) -> str:
    """Normalize text: lowercased, NFKD unicode normalization, punctuation stripped."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = text.lower()
    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    # Keep alphanumeric characters and whitespace across languages (supports Indian scripts)
    text = re.sub(r"[^\w\s]", " ", text, flags=re.UNICODE)
    # Collapse multiple whitespaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> List[str]:
    """Tokenize normalized text and remove common stopwords."""
    words = normalize_text(text).split()
    return [w for w in words if w not in STOPWORDS and len(w) > 1]


def compute_simhash(text: str, hash_bits: int = 64) -> int:
    """
    Compute a 64-bit SimHash fingerprint of the text.
    SimHash allows fast Hamming distance comparisons between texts.
    """
    tokens = tokenize(text)
    if not tokens:
        return 0

    v = [0] * hash_bits
    for token in tokens:
        # Generate 64-bit hash for token
        token_hash = int(hashlib.md5(token.encode("utf-8")).hexdigest()[:16], 16)
        for i in range(hash_bits):
            bitmask = 1 << i
            if token_hash & bitmask:
                v[i] += 1
            else:
                v[i] -= 1

    fingerprint = 0
    for i in range(hash_bits):
        if v[i] > 0:
            fingerprint |= (1 << i)

    return fingerprint


def simhash_similarity(hash1: int, hash2: int, hash_bits: int = 64) -> float:
    """Compute similarity (0.0 to 1.0) between two SimHash fingerprints using Hamming distance."""
    if hash1 == 0 or hash2 == 0:
        return 0.0
    xor_result = hash1 ^ hash2
    hamming_dist = bin(xor_result).count("1")
    return 1.0 - (hamming_dist / float(hash_bits))


def compute_tf_vector(tokens: List[str]) -> Dict[str, float]:
    """Compute term frequency vector with L2 normalization."""
    tf: Dict[str, float] = {}
    for token in tokens:
        tf[token] = tf.get(token, 0.0) + 1.0

    length = math.sqrt(sum(count * count for count in tf.values()))
    if length > 0:
        for token in tf:
            tf[token] /= length
    return tf


def cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """Calculate cosine similarity between two normalized term vectors."""
    if not vec1 or not vec2:
        return 0.0
    common_keys = set(vec1.keys()) & set(vec2.keys())
    return sum(vec1[k] * vec2[k] for k in common_keys)


def hamming_distance(hash1: int, hash2: int) -> int:
    """Calculate the Hamming distance between two integer hashes."""
    return bin(hash1 ^ hash2).count("1")


def compute_cosine_similarity(text1: str, text2: str) -> float:
    """Compute TF-IDF cosine similarity between two text strings."""
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    return cosine_similarity(compute_tf_vector(tokens1), compute_tf_vector(tokens2))


class DuplicateDetectionResult:
    """Result of duplicate analysis on a news story."""
    def __init__(
        self,
        is_duplicate: bool,
        duplicate_score: float,
        canonical_story_id: Optional[int],
        cluster_id: str,
        reason: str,
        matched_news_uid: Optional[str] = None
    ):
        self.is_duplicate = is_duplicate
        self.duplicate_score = round(duplicate_score, 4)
        self.canonical_story_id = canonical_story_id
        self.cluster_id = cluster_id
        self.reason = reason
        self.matched_news_uid = matched_news_uid

    def to_dict(self) -> dict:
        return {
            "is_duplicate": self.is_duplicate,
            "duplicate_score": self.duplicate_score,
            "canonical_story_id": self.canonical_story_id,
            "cluster_id": self.cluster_id,
            "reason": self.reason,
            "matched_news_uid": self.matched_news_uid
        }


class DuplicateDetectionService:
    """Service to evaluate incoming or existing stories for duplicate content."""

    EXACT_MATCH_THRESHOLD = 0.95
    NEAR_DUPLICATE_THRESHOLD = 0.80
    LOOKBACK_DAYS = 7

    def __init__(self, db: Session):
        self.db = db

    def generate_cluster_id(self, title: str) -> str:
        """Generate a stable cluster identifier based on title hash and timestamp."""
        normalized = normalize_text(title)
        return hashlib.sha256(f"cluster:{normalized[:50]}:{datetime.now(timezone.utc).date()}".encode()).hexdigest()[:16]

    def check_duplicate(
        self,
        title: str,
        summary: str,
        language_id: int,
        source_url: Optional[str] = None,
        exclude_news_id: Optional[int] = None
    ) -> DuplicateDetectionResult:
        """
        Check if the story is a duplicate of any recently published or pending news.
        Returns DuplicateDetectionResult with clustering details.
        """
        now = datetime.now(timezone.utc)
        since_date = now - timedelta(days=self.LOOKBACK_DAYS)

        norm_title = normalize_text(title)
        norm_summary = normalize_text(summary)
        norm_source_url = normalize_url(source_url)

        # 1. Exact Source URL match
        if norm_source_url:
            existing_by_url = self.db.query(News).filter(
                News.source_url.isnot(None),
                News.created_at >= since_date
            ).all()

            for n in existing_by_url:
                if exclude_news_id and n.id == exclude_news_id:
                    continue
                if normalize_url(n.source_url) == norm_source_url:
                    canonical_id = getattr(n, "canonical_story_id", None) or n.id
                    cluster_id = getattr(n, "cluster_id", None) or self.generate_cluster_id(n.title)
                    return DuplicateDetectionResult(
                        is_duplicate=True,
                        duplicate_score=1.0,
                        canonical_story_id=canonical_id,
                        cluster_id=cluster_id,
                        reason="Exact source URL match",
                        matched_news_uid=n.news_uid
                    )

        # 2. Query candidate stories in same language within lookback window
        candidate_query = self.db.query(News).filter(
            News.language_id == language_id,
            News.created_at >= since_date
        )
        if exclude_news_id:
            candidate_query = candidate_query.filter(News.id != exclude_news_id)

        candidates = candidate_query.order_by(desc(News.created_at)).limit(200).all()

        if not candidates:
            # First story in topic -> becomes canonical
            return DuplicateDetectionResult(
                is_duplicate=False,
                duplicate_score=0.0,
                canonical_story_id=None,
                cluster_id=self.generate_cluster_id(title),
                reason="No candidate stories in lookback window"
            )

        # 3. Compute SimHash and TF vectors for target
        target_full_text = f"{norm_title} {norm_summary}"
        target_simhash = compute_simhash(target_full_text)
        target_tokens = tokenize(target_full_text)
        target_tf = compute_tf_vector(target_tokens)

        best_score = 0.0
        best_candidate: Optional[News] = None
        match_reason = ""

        for candidate in candidates:
            cand_title_norm = normalize_text(candidate.title)
            cand_summary_norm = normalize_text(candidate.summary)
            cand_full_text = f"{cand_title_norm} {cand_summary_norm}"

            # Exact normalized title check
            if norm_title and norm_title == cand_title_norm:
                canonical_id = getattr(candidate, "canonical_story_id", None) or candidate.id
                cluster_id = getattr(candidate, "cluster_id", None) or self.generate_cluster_id(candidate.title)
                return DuplicateDetectionResult(
                    is_duplicate=True,
                    duplicate_score=1.0,
                    canonical_story_id=canonical_id,
                    cluster_id=cluster_id,
                    reason="Exact normalized title match",
                    matched_news_uid=candidate.news_uid
                )

            # Fast SimHash filter
            cand_simhash = compute_simhash(cand_full_text)
            sim_score = simhash_similarity(target_simhash, cand_simhash)

            # Detailed TF-IDF cosine similarity if candidate is promising
            if sim_score > 0.65:
                cand_tokens = tokenize(cand_full_text)
                cand_tf = compute_tf_vector(cand_tokens)
                cos_score = cosine_similarity(target_tf, cand_tf)

                # Weighted composite score: 60% cosine + 40% simhash
                composite_score = (0.6 * cos_score) + (0.4 * sim_score)

                if composite_score > best_score:
                    best_score = composite_score
                    best_candidate = candidate
                    match_reason = f"Content similarity ({round(composite_score * 100, 1)}%)"

        if best_candidate and best_score >= self.NEAR_DUPLICATE_THRESHOLD:
            canonical_id = getattr(best_candidate, "canonical_story_id", None) or best_candidate.id
            cluster_id = getattr(best_candidate, "cluster_id", None) or self.generate_cluster_id(best_candidate.title)
            return DuplicateDetectionResult(
                is_duplicate=True,
                duplicate_score=best_score,
                canonical_story_id=canonical_id,
                cluster_id=cluster_id,
                reason=match_reason,
                matched_news_uid=best_candidate.news_uid
            )

        # Unique story
        return DuplicateDetectionResult(
            is_duplicate=False,
            duplicate_score=best_score,
            canonical_story_id=None,
            cluster_id=self.generate_cluster_id(title),
            reason="Unique content (below similarity threshold)"
        )
