"""add_device_tokens

Revision ID: dd_device_tokens
Revises: d8b17fad2a2f
Create Date: 2026-05-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "dd_device_tokens"
down_revision: Union[str, None] = "d8b17fad2a2f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.create_table(
        'device_tokens',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_uid', sa.String, sa.ForeignKey('users.user_uid'), nullable=False),
        sa.Column('fcm_token', sa.String(255), nullable=False, unique=True),
        sa.Column('device_type', sa.String(20), nullable=False),
        sa.Column('device_name', sa.String(100), nullable=True),
        sa.Column('app_version', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_device_token_user', 'device_tokens', ['user_uid'])
    op.create_index('idx_device_token_active', 'device_tokens', ['is_active'])

def downgrade():
    op.drop_table('device_tokens')