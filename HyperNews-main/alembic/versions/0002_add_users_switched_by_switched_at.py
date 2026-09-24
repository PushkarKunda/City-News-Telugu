"""Add users.switched_by and users.switched_at (role switch tracking)

Revision ID: 0002_switched_cols
Revises: 0001_role_remap
Create Date: 2026-04-19

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_switched_cols"
down_revision: Union[str, None] = "0001_role_remap"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "users"


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(TABLE):
        return
    cols = {c["name"] for c in insp.get_columns(TABLE)}
    if "switched_by" not in cols:
        op.add_column(
            TABLE,
            sa.Column("switched_by", sa.String(length=8), nullable=True),
        )
        op.create_foreign_key(
            "fk_users_switched_by_user_uid",
            TABLE,
            TABLE,
            ["switched_by"],
            ["user_uid"],
        )
    if "switched_at" not in cols:
        op.add_column(
            TABLE,
            sa.Column("switched_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(TABLE):
        return
    cols = {c["name"] for c in insp.get_columns(TABLE)}
    if "switched_at" in cols:
        op.drop_column(TABLE, "switched_at")
    if "switched_by" in cols:
        op.drop_constraint("fk_users_switched_by_user_uid", TABLE, type_="foreignkey")
        op.drop_column(TABLE, "switched_by")
