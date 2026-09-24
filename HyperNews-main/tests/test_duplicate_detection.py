# tests/test_duplicate_detection.py
import pytest
from sqlalchemy.orm import Session

from services.duplicate_detection_service import (
    normalize_url,
    normalize_text,
    tokenize,
    compute_simhash,
    hamming_distance,
    compute_cosine_similarity,
    DuplicateDetectionService,
)
from models.news import News


def test_url_normalization():
    """Verify URL canonicalization strips tracking query params and normalizes domains."""
    url1 = "https://www.example.com/news/story-123/?utm_source=twitter&utm_medium=social&ref=feed"
    url2 = "https://example.com/news/story-123"

    assert normalize_url(url1) == normalize_url(url2)
    assert "utm_source" not in normalize_url(url1)


def test_text_normalization():
    """Verify text normalization removes punctuation and normalizes Unicode."""
    raw = "  BREAKING: Massive  Rainstorm Hits Hyderabad!!  Over 100mm recorded...  "
    expected = "breaking massive rainstorm hits hyderabad over 100mm recorded"
    assert normalize_text(raw) == expected


def test_multilingual_tokenization_and_stopwords():
    """Verify stopword filtering works for English and Indian transliterations."""
    text = "Breaking News: Government says new policy is live today in Telangana"
    tokens = tokenize(text)
    # 'breaking', 'news', 'says', 'is', 'today', 'in' are stopwords
    assert "government" in tokens
    assert "policy" in tokens
    assert "telangana" in tokens
    assert "breaking" not in tokens
    assert "news" not in tokens


def test_simhash_hamming_distance_exact_and_near():
    """SimHash should have 0 Hamming distance for identical texts and small distance for near-duplicates."""
    story_a = "Prime Minister inaugurates new international airport terminal in Mumbai with world class amenities"
    story_b = "Prime Minister inaugurates brand new international airport terminal in Mumbai with world class amenities"
    story_diff = "Sensex plummets 800 points as global tech stocks witness massive selloff across exchanges"

    hash_a = compute_simhash(story_a)
    hash_b = compute_simhash(story_b)
    hash_diff = compute_simhash(story_diff)

    dist_near = hamming_distance(hash_a, hash_b)
    dist_far = hamming_distance(hash_a, hash_diff)

    assert dist_near <= 8  # Near duplicate threshold (< 12.5% bit diff)
    assert dist_far > 15   # Unrelated stories have significantly higher distance


def test_tfidf_cosine_similarity():
    """Verify TF-IDF cosine similarity measures text overlap."""
    t1 = "Heavy rainfall causes waterlogging in central Hyderabad traffic police issue advisory"
    t2 = "Severe rain triggers waterlogging across central Hyderabad with traffic police issuing travel advisory"
    t3 = "Cricket team wins championship trophy after thrilling final match in London"

    sim_high = compute_cosine_similarity(t1, t2)
    sim_low = compute_cosine_similarity(t1, t3)

    assert sim_high >= 0.50
    assert sim_low <= 0.20


def test_duplicate_service_clustering(db: Session):
    """Verify DuplicateDetectionService clusters near-duplicate stories and identifies canonical."""
    # 1. Insert original canonical story
    original = News(
        news_uid="canonical_story_100",
        title="ISRO successfully launches new weather satellite from Sriharikota",
        summary="The Indian Space Research Organisation launched its advanced meteorological satellite today with flawless precision from the Satish Dhawan Space Centre.",
        language_id=1,
        user_uid="admin_uid_001",
        is_approved=1,
        is_duplicate=False,
    )
    db.add(original)
    db.commit()

    service = DuplicateDetectionService(db)

    # 2. Check near-duplicate submission
    candidate_title = "ISRO launches new meteorological weather satellite from Sriharikota space centre"
    candidate_summary = "Indian Space Research Organisation successfully launched its advanced weather satellite today from Satish Dhawan Space Centre."

    result = service.check_duplicate(
        title=candidate_title,
        summary=candidate_summary,
        language_id=1
    )

    assert result.is_duplicate is True
    assert result.duplicate_score >= 0.70
    assert result.matched_news_uid == original.news_uid
    assert result.canonical_story_id in (original.id, original.news_uid)

