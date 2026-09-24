"""sync_user_activity_logs_schema

Revision ID: 0003_sync_user_activity_logs
Revises: user_activity_001
Create Date: 2026-07-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import reflection


# revision identifiers, used by Alembic.
revision: str = "0003_sync_user_activity_logs"
down_revision: Union[str, None] = "user_activity_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector():
    return reflection.Inspector.from_engine(op.get_bind())


def _has_table(table_name: str) -> bool:
    return _inspector().has_table(table_name)


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in _inspector().get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    return {index["name"] for index in _inspector().get_indexes(table_name)}


def upgrade() -> None:
    if not _has_table("user_activity_logs"):
        op.create_table(
            "user_activity_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_uid", sa.String(), nullable=False),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("entity_type", sa.String(length=50), nullable=True),
            sa.Column("entity_id", sa.String(length=100), nullable=True),
            sa.Column("details", sa.JSON(), nullable=True),
            sa.Column("ip_address", sa.String(length=45), nullable=True),
            sa.Column("user_agent", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.ForeignKeyConstraint(["user_uid"], ["users.user_uid"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
    else:
        existing_columns = _columns("user_activity_logs")
        if "ip_address" not in existing_columns:
            op.add_column("user_activity_logs", sa.Column("ip_address", sa.String(length=45), nullable=True))
        if "user_agent" not in existing_columns:
            op.add_column("user_activity_logs", sa.Column("user_agent", sa.String(length=255), nullable=True))

    existing_indexes = _indexes("user_activity_logs")
    if "ix_user_activity_logs_id" not in existing_indexes:
        op.create_index(op.f("ix_user_activity_logs_id"), "user_activity_logs", ["id"], unique=False)
    if "ix_user_activity_logs_user_uid" not in existing_indexes:
        op.create_index(op.f("ix_user_activity_logs_user_uid"), "user_activity_logs", ["user_uid"], unique=False)
    if "ix_user_activity_logs_action" not in existing_indexes:
        op.create_index(op.f("ix_user_activity_logs_action"), "user_activity_logs", ["action"], unique=False)
    if "ix_user_activity_logs_entity_type" not in existing_indexes:
        op.create_index(op.f("ix_user_activity_logs_entity_type"), "user_activity_logs", ["entity_type"], unique=False)
    if "ix_user_activity_logs_created_at" not in existing_indexes:
        op.create_index(op.f("ix_user_activity_logs_created_at"), "user_activity_logs", ["created_at"], unique=False)
    if "ix_user_activity_user_created" not in existing_indexes:
        op.create_index("ix_user_activity_user_created", "user_activity_logs", ["user_uid", "created_at"], unique=False)
    if "ix_user_activity_entity" not in existing_indexes:
        op.create_index("ix_user_activity_entity", "user_activity_logs", ["entity_type", "entity_id"], unique=False)
    if "ix_user_activity_action" not in existing_indexes:
        op.create_index("ix_user_activity_action", "user_activity_logs", ["action", "created_at"], unique=False)


def downgrade() -> None:
    if not _has_table("user_activity_logs"):
        return

    existing_indexes = _indexes("user_activity_logs")
    for index_name in (
        "ix_user_activity_action",
        "ix_user_activity_entity",
        "ix_user_activity_user_created",
        "ix_user_activity_logs_created_at",
        "ix_user_activity_logs_entity_type",
        "ix_user_activity_logs_action",
        "ix_user_activity_logs_user_uid",
        "ix_user_activity_logs_id",
    ):
        if index_name in existing_indexes:
            op.drop_index(index_name, table_name="user_activity_logs")

    existing_columns = _columns("user_activity_logs")
    if "user_agent" in existing_columns:
        op.drop_column("user_activity_logs", "user_agent")
    if "ip_address" in existing_columns:
        op.drop_column("user_activity_logs", "ip_address")
