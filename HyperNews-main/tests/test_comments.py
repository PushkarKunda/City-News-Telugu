# tests/test_comments.py
import pytest
from datetime import datetime, timezone
from starlette.testclient import TestClient
from sqlalchemy.orm import Session

from models.news import News, Comment
from models.user import User


@pytest.fixture
def sample_news(db: Session, regular_user: User) -> News:
    """Create and return a published news article for commenting tests."""
    news = News(
        news_uid="test_article_001",
        title="Major Breakthrough in Renewable Energy Technology Announced",
        summary="Scientists discover high-efficiency solar panel manufacturing technique that reduces costs by 40%.",
        language_id=1,
        user_uid=regular_user.user_uid,
        is_approved=1,
        comments_count=0,
        views_count=10,
        likes_count=5,
        shares_count=1,
        created_at=datetime.now(timezone.utc),
    )
    db.add(news)
    db.commit()
    db.refresh(news)
    return news


def test_post_comment_success_201(client: TestClient, db: Session, user_headers: dict, regular_user: User, sample_news: News):
    """
    Test posting a comment:
    - Asserts 201 status
    - Asserts returned body contains id, article_id, user_id, user_name, text, created_at, comments_count
    - Asserts comments_count increases by exactly 1
    """
    initial_count = sample_news.comments_count or 0
    comment_text = "This is a fantastic development for renewable energy!"

    response = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=user_headers,
        json={"comment_text": comment_text}
    )

    assert response.status_code == 201
    data = response.json()

    # Assert required fields in the response body
    assert "id" in data
    assert isinstance(data["id"], int)
    assert data["article_id"] == sample_news.news_uid
    assert data["user_id"] == regular_user.user_uid
    assert data["user_name"] == (regular_user.name or regular_user.user_name)
    assert data["text"] == comment_text
    assert "created_at" in data
    assert data["comments_count"] == initial_count + 1

    # Verify database persistence
    db.refresh(sample_news)
    assert sample_news.comments_count == initial_count + 1

    saved_comment = db.query(Comment).filter_by(id=data["id"]).first()
    assert saved_comment is not None
    assert saved_comment.comment_text == comment_text
    assert saved_comment.news_uid == sample_news.news_uid
    assert saved_comment.user_uid == regular_user.user_uid


def test_post_comment_with_text_field(client: TestClient, db: Session, user_headers: dict, sample_news: News):
    """Test payload accepting 'text' field as well as 'comment_text'."""
    initial_count = sample_news.comments_count or 0
    response = client.post(
        f"/news/v1/user/news/{sample_news.news_uid}/comment",
        headers=user_headers,
        json={"text": "Comment using 'text' key instead of 'comment_text'"}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["text"] == "Comment using 'text' key instead of 'comment_text'"
    assert data["comments_count"] == initial_count + 1


def test_post_comment_empty_text_returns_400(client: TestClient, user_headers: dict, sample_news: News):
    """Posting empty comment text must return HTTP 400 Bad Request."""
    # Empty string
    res1 = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=user_headers,
        json={"comment_text": ""}
    )
    assert res1.status_code == 400

    # Whitespace only
    res2 = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=user_headers,
        json={"comment_text": "    "}
    )
    assert res2.status_code == 400

    # Missing text field entirely
    res3 = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=user_headers,
        json={}
    )
    assert res3.status_code == 400


def test_post_comment_too_long_returns_400(client: TestClient, user_headers: dict, sample_news: News):
    """Posting comment exceeding 1000 characters must return HTTP 400 Bad Request."""
    long_text = "x" * 1001
    response = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=user_headers,
        json={"comment_text": long_text}
    )
    assert response.status_code == 400
    assert "1000 characters" in response.json().get("detail", "")


def test_post_comment_unauthenticated_returns_401(client: TestClient, sample_news: News):
    """Posting comment without authentication token must return HTTP 401 Unauthorized."""
    response = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        json={"comment_text": "Anonymous comment attempt"}
    )
    assert response.status_code == 401


def test_post_comment_nonexistent_news_returns_404(client: TestClient, user_headers: dict):
    """Posting comment to non-existent news article must return HTTP 404 Not Found."""
    response = client.post(
        "/v1/user/news/non_existent_news_uid/comment",
        headers=user_headers,
        json={"comment_text": "Comment on ghost article"}
    )
    assert response.status_code == 404
    assert "News not found" in response.json().get("detail", "")


def test_post_comment_idempotency_prevents_duplicate(client: TestClient, db: Session, user_headers: dict, sample_news: News):
    """
    Submitting with an Idempotency-Key twice returns the same response without duplicate comments
    or double-incrementing comments_count.
    """
    idem_key = "test-idempotency-key-uuid-999"
    headers = {**user_headers, "Idempotency-Key": idem_key}

    # First attempt
    res1 = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=headers,
        json={"comment_text": "Idempotent comment message"}
    )
    assert res1.status_code == 201
    data1 = res1.json()
    first_id = data1["id"]
    count_after_first = data1["comments_count"]

    # Second attempt with same idempotency key
    res2 = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=headers,
        json={"comment_text": "Idempotent comment message"}
    )
    assert res2.status_code == 201
    data2 = res2.json()

    assert data2["id"] == first_id
    assert data2["comments_count"] == count_after_first

    # Ensure only 1 comment exists in DB with this text
    db.refresh(sample_news)
    assert sample_news.comments_count == count_after_first
    matching_comments = db.query(Comment).filter(
        Comment.news_uid == sample_news.news_uid,
        Comment.comment_text == "Idempotent comment message"
    ).all()
    assert len(matching_comments) == 1


def test_delete_comment_decrements_count(client: TestClient, db: Session, user_headers: dict, sample_news: News):
    """
    Posting a comment increments comments_count, and deleting it decrements comments_count by 1.
    """
    # 1. Post a comment
    post_res = client.post(
        f"/v1/user/news/{sample_news.news_uid}/comment",
        headers=user_headers,
        json={"comment_text": "Comment to be deleted shortly"}
    )
    assert post_res.status_code == 201
    comment_data = post_res.json()
    comment_id = comment_data["id"]
    count_after_add = comment_data["comments_count"]

    # 2. Delete the comment
    del_res = client.delete(
        f"/v1/user/news/{sample_news.news_uid}/comment/{comment_id}",
        headers=user_headers
    )
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["comments_count"] == count_after_add - 1

    # 3. Verify news comments_count in DB
    db.refresh(sample_news)
    assert sample_news.comments_count == count_after_add - 1

    # 4. Verify comment row deleted
    assert db.query(Comment).filter_by(id=comment_id).first() is None

