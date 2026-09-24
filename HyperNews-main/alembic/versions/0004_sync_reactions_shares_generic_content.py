"""sync reactions and shares generic content columns

Revision ID: 0004_sync_reactions_shares
Revises: 0003_sync_user_activity_logs
Create Date: 2026-07-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004_sync_reactions_shares"
down_revision: Union[str, None] = "0003_sync_user_activity_logs"
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


def _unique_constraints(table_name: str) -> set[str]:
    return {constraint["name"] for constraint in _inspector().get_unique_constraints(table_name)}


def _foreign_keys(table_name: str) -> set[str]:
    return {fk["name"] for fk in _inspector().get_foreign_keys(table_name) if fk["name"]}


def _add_column_if_missing(table_name: str, column_name: str, column: sa.Column) -> None:
    if column_name not in _columns(table_name):
        op.add_column(table_name, column)


def _drop_constraint_if_exists(table_name: str, constraint_name: str) -> None:
    if constraint_name in _unique_constraints(table_name):
        op.drop_constraint(constraint_name, table_name, type_="unique")
    elif constraint_name in _foreign_keys(table_name):
        op.drop_constraint(constraint_name, table_name, type_="foreignkey")


def _drop_index_if_exists(table_name: str, index_name: str) -> None:
    if index_name in _indexes(table_name):
        op.drop_index(index_name, table_name=table_name)


def _sync_reactions() -> None:
    if not _has_table("reactions"):
        return

    cols = _columns("reactions")
    _add_column_if_missing("reactions", "content_type", sa.Column("content_type", sa.String(length=30), nullable=True))
    _add_column_if_missing("reactions", "content_id", sa.Column("content_id", sa.Integer(), nullable=True))

    cols = _columns("reactions")
    if "news_uid" in cols:
        op.execute(
            sa.text(
                """
                UPDATE reactions AS r
                SET content_type = 'news',
                    content_id = n.id
                FROM news AS n
                WHERE r.news_uid = n.news_uid
                  AND (r.content_type IS NULL OR r.content_id IS NULL)
                """
            )
        )

    cols = _columns("reactions")
    reaction_type = cols.get("reaction_type")
    if reaction_type is not None and not isinstance(reaction_type["type"], sa.String):
        op.alter_column(
            "reactions",
            "reaction_type",
            existing_type=reaction_type["type"],
            type_=sa.String(length=20),
            postgresql_using=(
                "CASE reaction_type "
                "WHEN 1 THEN 'like' "
                "WHEN 2 THEN 'love' "
                "WHEN 3 THEN 'laugh' "
                "WHEN 4 THEN 'shock' "
                "WHEN 5 THEN 'sad' "
                "WHEN 6 THEN 'angry' "
                "ELSE reaction_type::text END"
            ),
        )
    else:
        op.execute(sa.text("UPDATE reactions SET reaction_type = 'like' WHERE reaction_type = '1'"))

    op.execute(sa.text("UPDATE reactions SET content_type = 'news' WHERE content_type IS NULL AND content_id IS NOT NULL"))

    _drop_constraint_if_exists("reactions", "unique_user_news_reaction")
    _drop_constraint_if_exists("reactions", "reactions_news_uid_fkey")
    _drop_index_if_exists("reactions", "ix_reactions_news_uid")

    existing_indexes = _indexes("reactions")
    if "ix_reactions_content" not in existing_indexes:
        op.create_index("ix_reactions_content", "reactions", ["content_type", "content_id", "reaction_type"], unique=False)
    if "ix_reactions_user" not in existing_indexes:
        op.create_index("ix_reactions_user", "reactions", ["user_uid", "created_at"], unique=False)

    duplicate_count = op.get_bind().execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM (
                SELECT user_uid, content_type, content_id
                FROM reactions
                WHERE content_type IS NOT NULL
                  AND content_id IS NOT NULL
                GROUP BY user_uid, content_type, content_id
                HAVING COUNT(*) > 1
            ) AS duplicate_reactions
            """
        )
    ).scalar()
    if duplicate_count == 0 and "unique_reaction" not in _unique_constraints("reactions"):
        op.create_unique_constraint("unique_reaction", "reactions", ["user_uid", "content_type", "content_id"])


def _sync_shares() -> None:
    if not _has_table("shares"):
        return

    cols = _columns("shares")
    _add_column_if_missing("shares", "content_type", sa.Column("content_type", sa.String(length=30), nullable=True))
    _add_column_if_missing("shares", "content_id", sa.Column("content_id", sa.Integer(), nullable=True))
    _add_column_if_missing("shares", "share_count", sa.Column("share_count", sa.Integer(), nullable=True, server_default="1"))
    _add_column_if_missing("shares", "created_at", sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True))

    cols = _columns("shares")
    if "news_uid" in cols:
        op.execute(
            sa.text(
                """
                UPDATE shares AS s
                SET content_type = 'news',
                    content_id = n.id
                FROM news AS n
                WHERE s.news_uid = n.news_uid
                  AND (s.content_type IS NULL OR s.content_id IS NULL)
                """
            )
        )
    if "shared_at" in cols and "created_at" in _columns("shares"):
        op.execute(sa.text("UPDATE shares SET created_at = shared_at WHERE created_at IS NULL"))

    op.execute(sa.text("UPDATE shares SET content_type = 'news' WHERE content_type IS NULL AND content_id IS NOT NULL"))
    op.execute(sa.text("UPDATE shares SET share_count = 1 WHERE share_count IS NULL"))

    _drop_index_if_exists("shares", "ix_shares_news_uid")

    existing_indexes = _indexes("shares")
    if "ix_shares_content" not in existing_indexes:
        op.create_index("ix_shares_content", "shares", ["content_type", "content_id"], unique=False)
    if "ix_shares_user" not in existing_indexes:
        op.create_index("ix_shares_user", "shares", ["user_uid", "created_at"], unique=False)
    if "ix_shares_platform" not in existing_indexes:
        op.create_index("ix_shares_platform", "shares", ["platform"], unique=False)


def upgrade() -> None:
    _sync_reactions()
    _sync_shares()


def downgrade() -> None:
    _drop_constraint_if_exists("reactions", "unique_reaction")
    _drop_index_if_exists("reactions", "ix_reactions_content")
    _drop_index_if_exists("reactions", "ix_reactions_user")
    _drop_index_if_exists("shares", "ix_shares_content")
    _drop_index_if_exists("shares", "ix_shares_user")
    _drop_index_if_exists("shares", "ix_shares_platform")
