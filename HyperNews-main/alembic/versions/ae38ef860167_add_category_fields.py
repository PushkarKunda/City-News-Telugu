"""add_category_fields

Revision ID: ae38ef860167
Revises: 0002_switched_cols
Create Date: 2026-04-20 16:33:40.631788

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ae38ef860167'
down_revision: Union[str, None] = '0002_switched_cols'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _install_safe_op_shims() -> None:
    """
    Make autogen migration resilient to schema drift.
    This DB already has a subset of objects, so strict CREATE/DROP fails.
    """
    create_index_orig = op.create_index
    drop_index_orig = op.drop_index
    drop_table_orig = op.drop_table
    create_unique_constraint_orig = op.create_unique_constraint
    drop_constraint_orig = op.drop_constraint
    create_foreign_key_orig = op.create_foreign_key

    def create_index_safe(*args, **kwargs):
        index_name = args[0] if len(args) > 0 else kwargs.get("index_name")
        table_name = args[1] if len(args) > 1 else kwargs.get("table_name")
        columns = args[2] if len(args) > 2 else kwargs.get("columns", [])
        unique = kwargs.get("unique", False)
        if table_name is None or columns is None:
            return create_index_orig(*args, **kwargs)
        index_sql = str(index_name)
        table_sql = str(table_name)
        cols_sql = ", ".join(str(c) for c in columns)
        unique_sql = "UNIQUE " if unique else ""
        return op.execute(sa.text(f"CREATE {unique_sql}INDEX IF NOT EXISTS {index_sql} ON {table_sql} ({cols_sql})"))

    def drop_index_safe(*args, **kwargs):
        index_name = args[0] if len(args) > 0 else kwargs.get("index_name")
        if index_name is None:
            return drop_index_orig(*args, **kwargs)
        return op.execute(sa.text(f"DROP INDEX IF EXISTS {str(index_name)}"))

    def drop_table_safe(*args, **kwargs):
        table_name = args[0] if len(args) > 0 else kwargs.get("table_name")
        if table_name is None:
            return drop_table_orig(*args, **kwargs)
        return op.execute(sa.text(f"DROP TABLE IF EXISTS {str(table_name)}"))

    def create_unique_constraint_safe(*args, **kwargs):
        name = args[0] if len(args) > 0 else kwargs.get("constraint_name")
        table_name = args[1] if len(args) > 1 else kwargs.get("table_name")
        columns = args[2] if len(args) > 2 else kwargs.get("columns", [])
        if name is None or table_name is None:
            return create_unique_constraint_orig(*args, **kwargs)
        constraint_name = str(name)
        table_sql = str(table_name)
        cols_sql = ", ".join(str(c) for c in columns)
        return op.execute(
            sa.text(
                f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{constraint_name}') "
                f"THEN ALTER TABLE {table_sql} ADD CONSTRAINT {constraint_name} UNIQUE ({cols_sql}); END IF; END $$;"
            )
        )

    def drop_constraint_safe(*args, **kwargs):
        name = args[0] if len(args) > 0 else kwargs.get("constraint_name")
        table_name = args[1] if len(args) > 1 else kwargs.get("table_name")
        if name is None or table_name is None:
            return drop_constraint_orig(*args, **kwargs)
        return op.execute(sa.text(f"ALTER TABLE {str(table_name)} DROP CONSTRAINT IF EXISTS {str(name)}"))

    def create_foreign_key_safe(*args, **kwargs):
        name = args[0] if len(args) > 0 else kwargs.get("constraint_name")
        source_table = args[1] if len(args) > 1 else kwargs.get("source_table")
        referent_table = args[2] if len(args) > 2 else kwargs.get("referent_table")
        local_cols = args[3] if len(args) > 3 else kwargs.get("local_cols", [])
        remote_cols = args[4] if len(args) > 4 else kwargs.get("remote_cols", [])
        ondelete = kwargs.get("ondelete")
        if name is None or source_table is None or referent_table is None:
            return create_foreign_key_orig(*args, **kwargs)
        constraint_name = str(name)
        src = str(source_table)
        ref = str(referent_table)
        local_cols_sql = ", ".join(str(c) for c in local_cols)
        remote_cols_sql = ", ".join(str(c) for c in remote_cols)
        ondelete_sql = f" ON DELETE {ondelete}" if ondelete else ""
        return op.execute(
            sa.text(
                f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '{constraint_name}') "
                f"THEN ALTER TABLE {src} ADD CONSTRAINT {constraint_name} FOREIGN KEY ({local_cols_sql}) "
                f"REFERENCES {ref} ({remote_cols_sql}){ondelete_sql}; END IF; END $$;"
            )
        )

    op.create_index = create_index_safe
    op.drop_index = drop_index_safe
    op.drop_table = drop_table_safe
    op.create_unique_constraint = create_unique_constraint_safe
    op.drop_constraint = drop_constraint_safe
    op.create_foreign_key = create_foreign_key_safe


def upgrade() -> None:
    _install_safe_op_shims()
    # ### commands auto generated by Alembic - please adjust! ###
    op.execute(sa.text('DROP INDEX IF EXISTS ix_news_shorts_video_id'))
    op.execute(sa.text('DROP TABLE IF EXISTS news_shorts'))
    op.execute(sa.text('DROP INDEX IF EXISTS ix_otp_stores_id'))
    op.execute(sa.text('DROP TABLE IF EXISTS otp_stores'))
    op.create_index('ix_ad_impressions_ad_session', 'ad_impressions', ['ad_id', 'session_id'], unique=False)
    op.create_index('ix_ad_impressions_user_session', 'ad_impressions', ['user_uid', 'session_id'], unique=False)
    op.create_unique_constraint('unique_ad_impression', 'ad_impressions', ['ad_id', 'session_id', 'user_uid'])
    op.alter_column('advertisements', 'title',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('advertisements', 'placement',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('advertisements', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True,
               existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    op.drop_index('idx_advertisements_created_by', table_name='advertisements')
    op.drop_index('idx_advertisements_is_approved', table_name='advertisements')
    op.drop_index('idx_advertisements_is_premium', table_name='advertisements')
    op.drop_index('idx_advertisements_premium_priority', table_name='advertisements')
    op.create_index('ix_advertisements_active_approved', 'advertisements', ['is_active', 'is_approved'], unique=False)
    op.create_index('ix_advertisements_city_id', 'advertisements', ['city_id'], unique=False)
    op.create_index('ix_advertisements_city_status', 'advertisements', ['city_id', 'is_active', 'is_approved'], unique=False)
    op.create_index('ix_advertisements_date_range', 'advertisements', ['start_date', 'end_date'], unique=False)
    op.create_index('ix_advertisements_district_id', 'advertisements', ['district_id'], unique=False)
    op.create_index('ix_advertisements_end_date', 'advertisements', ['end_date'], unique=False)
    op.create_index(op.f('ix_advertisements_id'), 'advertisements', ['id'], unique=False)
    op.create_index('ix_advertisements_is_active', 'advertisements', ['is_active'], unique=False)
    op.create_index('ix_advertisements_is_approved', 'advertisements', ['is_approved'], unique=False)
    op.create_index(op.f('ix_advertisements_is_premium'), 'advertisements', ['is_premium'], unique=False)
    op.create_index('ix_advertisements_language_id', 'advertisements', ['language_id'], unique=False)
    op.create_index('ix_advertisements_placement', 'advertisements', ['placement'], unique=False)
    op.create_index('ix_advertisements_premium_active', 'advertisements', ['is_premium', 'is_active', 'is_approved'], unique=False)
    op.create_index('ix_advertisements_start_date', 'advertisements', ['start_date'], unique=False)
    op.create_index('ix_advertisements_state_id', 'advertisements', ['state_id'], unique=False)
    op.add_column('categories', sa.Column('image_url', sa.String(length=500), nullable=True))
    op.add_column('categories', sa.Column('display_order', sa.Integer(), nullable=True))
    op.add_column('categories', sa.Column('is_active', sa.Boolean(), nullable=True))
    op.add_column('categories', sa.Column('color', sa.String(length=7), nullable=True))
    op.add_column('categories', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('categories', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))
    op.add_column('categories', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    op.drop_constraint('categories_name_key', 'categories', type_='unique')
    op.create_index(op.f('ix_categories_display_order'), 'categories', ['display_order'], unique=False)
    op.create_index(op.f('ix_categories_is_active'), 'categories', ['is_active'], unique=False)
    op.create_index(op.f('ix_categories_name'), 'categories', ['name'], unique=True)
    op.create_index(op.f('ix_comments_news_uid'), 'comments', ['news_uid'], unique=False)
    op.create_index(op.f('ix_comments_user_uid'), 'comments', ['user_uid'], unique=False)
    op.drop_constraint('comments_news_uid_fkey', 'comments', type_='foreignkey')
    op.create_foreign_key(None, 'comments', 'news', ['news_uid'], ['news_uid'], ondelete='CASCADE')
    op.alter_column('news', 'news_uid',
               existing_type=sa.VARCHAR(length=12),
               type_=sa.String(length=6),
               existing_nullable=False)
    op.alter_column('news', 'source_url',
               existing_type=sa.TEXT(),
               type_=sa.String(),
               existing_nullable=True)
    op.alter_column('news', 'source_name',
               existing_type=sa.TEXT(),
               type_=sa.String(),
               existing_nullable=True)
    op.alter_column('news', 'rejected_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('news', 'breaking_expires_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.drop_index('idx_news_approved_at', table_name='news')
    op.drop_index('idx_news_rejected_at', table_name='news')
    op.drop_index('idx_news_rejected_by_uid', table_name='news')
    op.drop_index('ix_news_language', table_name='news')
    op.create_index(op.f('ix_news_city_id'), 'news', ['city_id'], unique=False)
    op.create_index(op.f('ix_news_created_at'), 'news', ['created_at'], unique=False)
    op.create_index(op.f('ix_news_is_breaking'), 'news', ['is_breaking'], unique=False)
    op.create_foreign_key(None, 'news', 'users', ['approved_by_uid'], ['user_uid'])
    op.drop_column('news', 'language')
    op.drop_constraint('news_categories_news_id_fkey', 'news_categories', type_='foreignkey')
    op.drop_constraint('news_categories_category_id_fkey', 'news_categories', type_='foreignkey')
    op.create_foreign_key(None, 'news_categories', 'news', ['news_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'news_categories', 'categories', ['category_id'], ['id'], ondelete='CASCADE')
    op.alter_column('news_flags', 'reviewed_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('news_flags', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.create_index(op.f('ix_news_flags_news_uid'), 'news_flags', ['news_uid'], unique=False)
    op.create_index(op.f('ix_news_flags_status'), 'news_flags', ['status'], unique=False)
    op.create_index(op.f('ix_news_flags_user_uid'), 'news_flags', ['user_uid'], unique=False)
    op.create_unique_constraint('unique_user_news_flag', 'news_flags', ['news_uid', 'user_uid'])
    op.create_index(op.f('ix_news_views_news_uid'), 'news_views', ['news_uid'], unique=False)
    op.create_index(op.f('ix_news_views_user_uid'), 'news_views', ['user_uid'], unique=False)
    op.create_index('ix_notifications_user_created', 'notifications', ['user_uid', 'created_at'], unique=False)
    op.alter_column('otp_store', 'otp',
               existing_type=sa.VARCHAR(length=128),
               type_=sa.String(length=100),
               existing_nullable=False)
    op.drop_column('otp_store', 'attempts')
    op.drop_column('otp_store', 'otp_hashed')
    op.create_index(op.f('ix_reactions_news_uid'), 'reactions', ['news_uid'], unique=False)
    op.create_index(op.f('ix_reactions_user_uid'), 'reactions', ['user_uid'], unique=False)
    op.create_unique_constraint('unique_user_news_reaction', 'reactions', ['user_uid', 'news_uid', 'reaction_type'])
    op.drop_constraint('reactions_news_uid_fkey', 'reactions', type_='foreignkey')
    op.create_foreign_key(None, 'reactions', 'news', ['news_uid'], ['news_uid'], ondelete='CASCADE')
    op.create_index(op.f('ix_shares_news_uid'), 'shares', ['news_uid'], unique=False)
    op.create_index(op.f('ix_shares_user_uid'), 'shares', ['user_uid'], unique=False)
    op.alter_column('sponsored_impressions', 'post_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.drop_index('idx_sponsored_impressions_impression_at', table_name='sponsored_impressions')
    op.drop_index('idx_sponsored_impressions_post_id', table_name='sponsored_impressions')
    op.drop_index('idx_sponsored_impressions_session_id', table_name='sponsored_impressions')
    op.drop_index('idx_sponsored_impressions_session_post', table_name='sponsored_impressions')
    op.drop_index('idx_sponsored_impressions_user_uid', table_name='sponsored_impressions')
    op.create_index(op.f('ix_sponsored_impressions_id'), 'sponsored_impressions', ['id'], unique=False)
    op.create_index('ix_sponsored_impressions_post_session', 'sponsored_impressions', ['post_id', 'session_id'], unique=False)
    op.create_index(op.f('ix_sponsored_impressions_session_id'), 'sponsored_impressions', ['session_id'], unique=False)
    op.create_index('ix_sponsored_impressions_user_session', 'sponsored_impressions', ['user_uid', 'session_id'], unique=False)
    op.create_index(op.f('ix_sponsored_impressions_user_uid'), 'sponsored_impressions', ['user_uid'], unique=False)
    op.alter_column('sponsored_posts', 'updated_at',
               existing_type=postgresql.TIMESTAMP(timezone=True),
               type_=sa.DateTime(),
               existing_nullable=True)
    op.drop_index('ix_sponsored_posts_city', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_district', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_state', table_name='sponsored_posts')
    op.create_index('ix_sponsored_posts_active', 'sponsored_posts', ['is_approved', 'start_date', 'end_date'], unique=False)
    op.create_index('ix_sponsored_posts_city_id', 'sponsored_posts', ['city_id'], unique=False)
    op.create_index('ix_sponsored_posts_district_id', 'sponsored_posts', ['district_id'], unique=False)
    op.create_index('ix_sponsored_posts_end_date', 'sponsored_posts', ['end_date'], unique=False)
    op.create_index('ix_sponsored_posts_is_approved', 'sponsored_posts', ['is_approved'], unique=False)
    op.create_index('ix_sponsored_posts_language_id', 'sponsored_posts', ['language_id'], unique=False)
    op.create_index('ix_sponsored_posts_start_date', 'sponsored_posts', ['start_date'], unique=False)
    op.create_index('ix_sponsored_posts_state_id', 'sponsored_posts', ['state_id'], unique=False)
    op.create_foreign_key(None, 'sponsored_posts', 'cities', ['city_id'], ['id'])
    op.create_foreign_key(None, 'sponsored_posts', 'languages', ['language_id'], ['id'])
    op.create_foreign_key(None, 'sponsored_posts', 'districts', ['district_id'], ['id'])
    op.create_foreign_key(None, 'sponsored_posts', 'states', ['state_id'], ['id'])
    op.drop_column('sponsored_posts', 'city')
    op.drop_column('sponsored_posts', 'state')
    op.drop_column('sponsored_posts', 'district')
    op.alter_column('users', 'token_version',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_server_default=sa.text('0'))
    op.alter_column('users', 'suspended_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('users', 'suspended_until',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.alter_column('users', 'activated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.DateTime(timezone=True),
               existing_nullable=True)
    op.create_index(op.f('ix_users_is_suspended'), 'users', ['is_suspended'], unique=False)
    op.create_unique_constraint(None, 'users', ['email'])
    op.create_foreign_key(None, 'users', 'states', ['state_id'], ['id'])
    op.create_foreign_key(None, 'users', 'districts', ['district_id'], ['id'])
    op.create_foreign_key(None, 'users', 'cities', ['city_id'], ['id'])
    op.create_foreign_key(None, 'users', 'users', ['suspended_by'], ['user_uid'])
    op.drop_column('users', 'city')
    op.drop_column('users', 'state')
    op.drop_column('users', 'district')
    op.drop_column('users', 'approved_by_uid')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('approved_by_uid', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('district', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('state', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('users', sa.Column('city', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_constraint(None, 'users', type_='unique')
    op.drop_index(op.f('ix_users_is_suspended'), table_name='users')
    op.alter_column('users', 'activated_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('users', 'suspended_until',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('users', 'suspended_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('users', 'token_version',
               existing_type=sa.INTEGER(),
               nullable=False,
               existing_server_default=sa.text('0'))
    op.add_column('sponsored_posts', sa.Column('district', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('sponsored_posts', sa.Column('state', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('sponsored_posts', sa.Column('city', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_constraint(None, 'sponsored_posts', type_='foreignkey')
    op.drop_constraint(None, 'sponsored_posts', type_='foreignkey')
    op.drop_constraint(None, 'sponsored_posts', type_='foreignkey')
    op.drop_constraint(None, 'sponsored_posts', type_='foreignkey')
    op.drop_index('ix_sponsored_posts_state_id', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_start_date', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_language_id', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_is_approved', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_end_date', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_district_id', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_city_id', table_name='sponsored_posts')
    op.drop_index('ix_sponsored_posts_active', table_name='sponsored_posts')
    op.create_index('ix_sponsored_posts_state', 'sponsored_posts', ['state'], unique=False)
    op.create_index('ix_sponsored_posts_district', 'sponsored_posts', ['district'], unique=False)
    op.create_index('ix_sponsored_posts_city', 'sponsored_posts', ['city'], unique=False)
    op.alter_column('sponsored_posts', 'updated_at',
               existing_type=sa.DateTime(),
               type_=postgresql.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.drop_index(op.f('ix_sponsored_impressions_user_uid'), table_name='sponsored_impressions')
    op.drop_index('ix_sponsored_impressions_user_session', table_name='sponsored_impressions')
    op.drop_index(op.f('ix_sponsored_impressions_session_id'), table_name='sponsored_impressions')
    op.drop_index('ix_sponsored_impressions_post_session', table_name='sponsored_impressions')
    op.drop_index(op.f('ix_sponsored_impressions_id'), table_name='sponsored_impressions')
    op.create_index('idx_sponsored_impressions_user_uid', 'sponsored_impressions', ['user_uid'], unique=False)
    op.create_index('idx_sponsored_impressions_session_post', 'sponsored_impressions', ['session_id', 'post_id'], unique=False)
    op.create_index('idx_sponsored_impressions_session_id', 'sponsored_impressions', ['session_id'], unique=False)
    op.create_index('idx_sponsored_impressions_post_id', 'sponsored_impressions', ['post_id'], unique=False)
    op.create_index('idx_sponsored_impressions_impression_at', 'sponsored_impressions', ['impression_at'], unique=False)
    op.alter_column('sponsored_impressions', 'post_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.drop_index(op.f('ix_shares_user_uid'), table_name='shares')
    op.drop_index(op.f('ix_shares_news_uid'), table_name='shares')
    op.drop_constraint(None, 'reactions', type_='foreignkey')
    op.create_foreign_key('reactions_news_uid_fkey', 'reactions', 'news', ['news_uid'], ['news_uid'])
    op.drop_constraint('unique_user_news_reaction', 'reactions', type_='unique')
    op.drop_index(op.f('ix_reactions_user_uid'), table_name='reactions')
    op.drop_index(op.f('ix_reactions_news_uid'), table_name='reactions')
    op.add_column('otp_store', sa.Column('otp_hashed', sa.VARCHAR(length=255), autoincrement=False, nullable=True))
    op.add_column('otp_store', sa.Column('attempts', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=True))
    op.alter_column('otp_store', 'otp',
               existing_type=sa.String(length=100),
               type_=sa.VARCHAR(length=128),
               existing_nullable=False)
    op.drop_index('ix_notifications_user_created', table_name='notifications')
    op.drop_index(op.f('ix_news_views_user_uid'), table_name='news_views')
    op.drop_index(op.f('ix_news_views_news_uid'), table_name='news_views')
    op.drop_constraint('unique_user_news_flag', 'news_flags', type_='unique')
    op.drop_index(op.f('ix_news_flags_user_uid'), table_name='news_flags')
    op.drop_index(op.f('ix_news_flags_status'), table_name='news_flags')
    op.drop_index(op.f('ix_news_flags_news_uid'), table_name='news_flags')
    op.alter_column('news_flags', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('news_flags', 'reviewed_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.drop_constraint(None, 'news_categories', type_='foreignkey')
    op.drop_constraint(None, 'news_categories', type_='foreignkey')
    op.create_foreign_key('news_categories_category_id_fkey', 'news_categories', 'categories', ['category_id'], ['id'])
    op.create_foreign_key('news_categories_news_id_fkey', 'news_categories', 'news', ['news_id'], ['id'])
    op.add_column('news', sa.Column('language', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.drop_constraint(None, 'news', type_='foreignkey')
    op.drop_index(op.f('ix_news_is_breaking'), table_name='news')
    op.drop_index(op.f('ix_news_created_at'), table_name='news')
    op.drop_index(op.f('ix_news_city_id'), table_name='news')
    op.create_index('ix_news_language', 'news', ['language'], unique=False)
    op.create_index('idx_news_rejected_by_uid', 'news', ['rejected_by_uid'], unique=False)
    op.create_index('idx_news_rejected_at', 'news', ['rejected_at'], unique=False)
    op.create_index('idx_news_approved_at', 'news', ['approved_at'], unique=False)
    op.alter_column('news', 'breaking_expires_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('news', 'rejected_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('news', 'source_name',
               existing_type=sa.String(),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.alter_column('news', 'source_url',
               existing_type=sa.String(),
               type_=sa.TEXT(),
               existing_nullable=True)
    op.alter_column('news', 'news_uid',
               existing_type=sa.String(length=6),
               type_=sa.VARCHAR(length=12),
               existing_nullable=False)
    op.drop_constraint(None, 'comments', type_='foreignkey')
    op.create_foreign_key('comments_news_uid_fkey', 'comments', 'news', ['news_uid'], ['news_uid'])
    op.drop_index(op.f('ix_comments_user_uid'), table_name='comments')
    op.drop_index(op.f('ix_comments_news_uid'), table_name='comments')
    op.drop_index(op.f('ix_categories_name'), table_name='categories')
    op.drop_index(op.f('ix_categories_is_active'), table_name='categories')
    op.drop_index(op.f('ix_categories_display_order'), table_name='categories')
    op.create_unique_constraint('categories_name_key', 'categories', ['name'])
    op.drop_column('categories', 'updated_at')
    op.drop_column('categories', 'created_at')
    op.drop_column('categories', 'description')
    op.drop_column('categories', 'color')
    op.drop_column('categories', 'is_active')
    op.drop_column('categories', 'display_order')
    op.drop_column('categories', 'image_url')
    op.drop_index('ix_advertisements_state_id', table_name='advertisements')
    op.drop_index('ix_advertisements_start_date', table_name='advertisements')
    op.drop_index('ix_advertisements_premium_active', table_name='advertisements')
    op.drop_index('ix_advertisements_placement', table_name='advertisements')
    op.drop_index('ix_advertisements_language_id', table_name='advertisements')
    op.drop_index(op.f('ix_advertisements_is_premium'), table_name='advertisements')
    op.drop_index('ix_advertisements_is_approved', table_name='advertisements')
    op.drop_index('ix_advertisements_is_active', table_name='advertisements')
    op.drop_index(op.f('ix_advertisements_id'), table_name='advertisements')
    op.drop_index('ix_advertisements_end_date', table_name='advertisements')
    op.drop_index('ix_advertisements_district_id', table_name='advertisements')
    op.drop_index('ix_advertisements_date_range', table_name='advertisements')
    op.drop_index('ix_advertisements_city_status', table_name='advertisements')
    op.drop_index('ix_advertisements_city_id', table_name='advertisements')
    op.drop_index('ix_advertisements_active_approved', table_name='advertisements')
    op.create_index('idx_advertisements_premium_priority', 'advertisements', ['premium_priority'], unique=False)
    op.create_index('idx_advertisements_is_premium', 'advertisements', ['is_premium'], unique=False)
    op.create_index('idx_advertisements_is_approved', 'advertisements', ['is_approved'], unique=False)
    op.create_index('idx_advertisements_created_by', 'advertisements', ['created_by'], unique=False)
    op.alter_column('advertisements', 'created_at',
               existing_type=sa.DateTime(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True,
               existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    op.alter_column('advertisements', 'placement',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('advertisements', 'title',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.drop_constraint('unique_ad_impression', 'ad_impressions', type_='unique')
    op.drop_index('ix_ad_impressions_user_session', table_name='ad_impressions')
    op.drop_index('ix_ad_impressions_ad_session', table_name='ad_impressions')
    op.create_table('otp_stores',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_uid', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('email', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('email_otp', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('mobile', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('mobile_otp', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_uid'], ['users.user_uid'], name='otp_stores_user_uid_fkey'),
    sa.PrimaryKeyConstraint('id', name='otp_stores_pkey')
    )
    op.create_index('ix_otp_stores_id', 'otp_stores', ['id'], unique=False)
    op.create_table('news_shorts',
    sa.Column('video_id', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('title', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('thumbnail', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('channel', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('published_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.Column('video_url', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('video_id', name='news_shorts_pkey')
    )
    op.create_index('ix_news_shorts_video_id', 'news_shorts', ['video_id'], unique=False)
    op.create_table('menu_items',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('title', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('link', sa.VARCHAR(length=500), autoincrement=False, nullable=False),
    sa.Column('item_type', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('category_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('parent_id', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('display_order', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('placement', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('target', sa.VARCHAR(length=10), autoincrement=False, nullable=True),
    sa.Column('icon', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('color', sa.VARCHAR(length=7), autoincrement=False, nullable=True),
    sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], name='menu_items_category_id_fkey'),
    sa.ForeignKeyConstraint(['parent_id'], ['menu_items.id'], name='menu_items_parent_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='menu_items_pkey')
    )
    op.create_index('ix_menu_items_display_order', 'menu_items', ['display_order'], unique=False)
    op.create_index('ix_menu_items_parent_id', 'menu_items', ['parent_id'], unique=False)
    op.create_index('ix_menu_items_placement', 'menu_items', ['placement'], unique=False)
    op.create_index('ix_menu_items_is_active', 'menu_items', ['is_active'], unique=False)
    op.create_index('ix_menu_items_item_type', 'menu_items', ['item_type'], unique=False)
    op.create_index('ix_menu_items_link', 'menu_items', ['link'], unique=False)
    op.create_index('ix_menu_items_title', 'menu_items', ['title'], unique=False)
    # ### end Alembic commands ###
