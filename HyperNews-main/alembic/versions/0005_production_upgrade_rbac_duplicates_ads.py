"""Production upgrade for RBAC, duplicate detection, news ranking, and ad-tech monetization

Revision ID: 0005_prod_upgrade
Revises: 0004_sync_reactions_shares
Create Date: 2026-09-12 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0005_prod_upgrade"
down_revision: Union[str, None] = "0004_sync_reactions_shares"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(table_name: str) -> bool:
    return _inspector().has_table(table_name)


def _columns(table_name: str) -> dict[str, dict]:
    return {column["name"]: column for column in _inspector().get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in _inspector().get_indexes(table_name)}


def _add_column_if_missing(table_name: str, column_name: str, column: sa.Column) -> None:
    if column_name not in _columns(table_name):
        op.add_column(table_name, column)


def _add_index_if_missing(table_name: str, index_name: str, columns: list[str], unique: bool = False) -> None:
    if index_name not in _indexes(table_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    # 1. Users Table Enhancements (Password Auth & Indexes)
    if _has_table("users"):
        _add_column_if_missing("users", "hashed_password", sa.Column("hashed_password", sa.String(length=255), nullable=True))
        _add_index_if_missing("users", "ix_users_email", ["email"])
        _add_index_if_missing("users", "ix_users_phone", ["phone"])
        _add_index_if_missing("users", "ix_users_role", ["role"])
        _add_index_if_missing("users", "ix_users_is_suspended", ["is_suspended"])

    # 2. News Table Enhancements (Duplicates, Quality, Ranking, Workflow)
    if _has_table("news"):
        _add_column_if_missing("news", "source_id", sa.Column("source_id", sa.Integer(), nullable=True))
        _add_column_if_missing("news", "cluster_id", sa.Column("cluster_id", sa.String(length=64), nullable=True))
        _add_column_if_missing("news", "canonical_story_id", sa.Column("canonical_story_id", sa.Integer(), nullable=True))
        _add_column_if_missing("news", "is_duplicate", sa.Column("is_duplicate", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        _add_column_if_missing("news", "duplicate_score", sa.Column("duplicate_score", sa.Float(), nullable=False, server_default="0.0"))
        _add_column_if_missing("news", "quality_score", sa.Column("quality_score", sa.Float(), nullable=False, server_default="0.0"))
        _add_column_if_missing("news", "ranking_score", sa.Column("ranking_score", sa.Float(), nullable=False, server_default="0.0"))
        _add_column_if_missing("news", "status", sa.Column("status", sa.String(length=30), nullable=False, server_default="PUBLISHED"))

        _add_index_if_missing("news", "ix_news_cluster_id", ["cluster_id"])
        _add_index_if_missing("news", "ix_news_ranking_score", ["ranking_score"])
        _add_index_if_missing("news", "ix_news_feed_active", ["status", "is_active", "is_duplicate", "published_at"])

    # 3. News Sources Table
    if not _has_table("news_sources"):
        op.create_table(
            "news_sources",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("source_uid", sa.String(length=64), nullable=False, unique=True, index=True),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("feed_url", sa.String(length=512), nullable=True),
            sa.Column("api_endpoint", sa.String(length=512), nullable=True),
            sa.Column("source_type", sa.String(length=20), nullable=False, server_default="RSS"),
            sa.Column("language", sa.String(length=10), nullable=False, server_default="en"),
            sa.Column("category_id", sa.Integer(), nullable=True),
            sa.Column("state_id", sa.Integer(), nullable=True),
            sa.Column("district_id", sa.Integer(), nullable=True),
            sa.Column("city_id", sa.Integer(), nullable=True),
            sa.Column("reliability_score", sa.Float(), nullable=False, server_default="1.0"),
            sa.Column("fetch_frequency_minutes", sa.Integer(), nullable=False, server_default="30"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("auto_publish", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("last_fetched_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 4. Advertisers Table
    if not _has_table("advertisers"):
        op.create_table(
            "advertisers",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("advertiser_uid", sa.String(length=64), nullable=False, unique=True, index=True),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("contact_email", sa.String(length=255), nullable=False),
            sa.Column("contact_phone", sa.String(length=30), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("billing_details", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 5. Campaigns Table
    if not _has_table("campaigns"):
        op.create_table(
            "campaigns",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("campaign_uid", sa.String(length=64), nullable=False, unique=True, index=True),
            sa.Column("advertiser_id", sa.Integer(), sa.ForeignKey("advertisers.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
            sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
            sa.Column("total_budget", sa.Numeric(12, 2), nullable=False, server_default="0.0"),
            sa.Column("daily_budget", sa.Numeric(12, 2), nullable=False, server_default="0.0"),
            sa.Column("cpm_rate", sa.Numeric(10, 4), nullable=False, server_default="0.0"),
            sa.Column("cpc_rate", sa.Numeric(10, 4), nullable=False, server_default="0.0"),
            sa.Column("targeting", sa.JSON(), nullable=True),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 6. Ad Unit Configs Table
    if not _has_table("ad_unit_configs"):
        op.create_table(
            "ad_unit_configs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("unit_uid", sa.String(length=64), nullable=False, unique=True, index=True),
            sa.Column("placement_key", sa.String(length=50), nullable=False, index=True),
            sa.Column("ad_provider", sa.String(length=30), nullable=False, server_default="ADMOB"),
            sa.Column("unit_id", sa.String(length=255), nullable=False),
            sa.Column("refresh_interval_seconds", sa.Integer(), nullable=False, server_default="30"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("fallback_provider", sa.String(length=30), nullable=True),
            sa.Column("extra_config", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # 7. Ad Events Table
    if not _has_table("ad_events"):
        op.create_table(
            "ad_events",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("event_uid", sa.String(length=64), nullable=False, unique=True, index=True),
            sa.Column("campaign_id", sa.Integer(), nullable=True, index=True),
            sa.Column("ad_unit_id", sa.Integer(), nullable=True, index=True),
            sa.Column("event_type", sa.String(length=20), nullable=False, index=True),
            sa.Column("user_uid", sa.String(length=64), nullable=True, index=True),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("device_id", sa.String(length=128), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        )

    # 8. Audit Logs Table
    if not _has_table("audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("actor_uid", sa.String(length=64), nullable=True, index=True),
            sa.Column("actor_role", sa.String(length=50), nullable=True),
            sa.Column("action", sa.String(length=100), nullable=False, index=True),
            sa.Column("resource_type", sa.String(length=50), nullable=False, index=True),
            sa.Column("resource_id", sa.String(length=128), nullable=True),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("user_agent", sa.String(length=255), nullable=True),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        )


def downgrade() -> None:
    for tbl in ["audit_logs", "ad_events", "ad_unit_configs", "campaigns", "advertisers", "news_sources"]:
        if _has_table(tbl):
            op.drop_table(tbl)
