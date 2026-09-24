"""Remap legacy user roles to UserRole 0-5 (MODERATOR/EMPLOYEE/ADMIN)

Legacy encoding: 0-2 unchanged, 3=Employee, 4=Admin
New encoding: 3=MODERATOR, 4=EMPLOYEE, 5=ADMIN

This migration rewrites existing DB rows in two steps (order is required):
1) role 4 -> 5  (old admins)
2) role 3 -> 4  (old employees)

If your database was created after this scheme (never had the old 3/4 meaning),
and all rows already use 0-5, running this is usually harmless: no rows at 3 or 4
in the *old* sense, but see notes below.

**Before first deploy with moderators:** run once against production/staging
before or right after shipping code that uses the new `UserRole` values.

**Downgrade:** Reverses the int mapping; it cannot distinguish a user who is
*moderator* (new 3) from a *legacy* employee, so that distinction is not restored.

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_role_remap"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "users"


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(TABLE) or "role" not in {c["name"] for c in insp.get_columns(TABLE)}:
        return
    # Admins first so employees can move into 4 without clashing
    op.execute(
        sa.text("UPDATE users SET role = 5 WHERE role = 4")
    )
    op.execute(
        sa.text("UPDATE users SET role = 4 WHERE role = 3")
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if not insp.has_table(TABLE) or "role" not in {c["name"] for c in insp.get_columns(TABLE)}:
        return
    # Inverse of upgrade: first revert 4 -> 3 (migrated ex-employees only; admins are still 5)
    # then 5 -> 4 (migrated ex-admins). Reversing order avoids merging employee and admin rows.
    op.execute(
        sa.text("UPDATE users SET role = 3 WHERE role = 4")
    )
    op.execute(
        sa.text("UPDATE users SET role = 4 WHERE role = 5")
    )
