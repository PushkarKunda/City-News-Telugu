"""add_user_activity_tables

Revision ID: user_activity_001
Revises: previous_revision_id
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine import reflection

# revision identifiers, used by Alembic.
revision = 'user_activity_001'
down_revision = '91ecee59e0f1'
branch_labels = None
depends_on = None


def has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = reflection.Inspector.from_engine(bind)
    return inspector.has_table(table_name)


def upgrade() -> None:
    """Create user activity tables"""
    
    # 1. Create user_sessions table
    if not has_table('user_sessions'):
        op.create_table(
            'user_sessions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('session_id_hash', sa.String(length=64), nullable=False),
            sa.Column('user_uid', sa.String(length=8), nullable=False),
            sa.Column('device_fingerprint', sa.String(length=64), nullable=False),
            sa.Column('device_id_hash', sa.String(length=64), nullable=False),
            sa.Column('device_type', sa.String(length=20), nullable=False),
            sa.Column('device_name', sa.Text(), nullable=True),
            sa.Column('device_model', sa.Text(), nullable=True),
            sa.Column('os_version', sa.Text(), nullable=True),
            sa.Column('app_version', sa.Text(), nullable=True),
            sa.Column('fcm_token', sa.Text(), nullable=True),
            sa.Column('ip_address', sa.Text(), nullable=True),
            sa.Column('user_agent_hash', sa.String(length=64), nullable=True),
            sa.Column('location', sa.Text(), nullable=True),
            sa.Column('session_token_version', sa.Integer(), nullable=True),
            sa.Column('csrf_token_hash', sa.String(length=64), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('is_current', sa.Boolean(), nullable=True),
            sa.Column('is_verified', sa.Boolean(), nullable=True),
            sa.Column('login_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('last_activity_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('logout_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('token_version', sa.Integer(), nullable=True),
            sa.Column('refresh_token_hash', sa.String(length=64), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('session_id_hash', name='uq_user_sessions_session_id_hash')
        )
        
        # Create indexes for user_sessions
        op.create_index('idx_session_user_active', 'user_sessions', ['user_uid', 'is_active'])
        op.create_index('idx_session_fingerprint', 'user_sessions', ['device_fingerprint', 'user_uid'])
        op.create_index('idx_session_expires', 'user_sessions', ['expires_at'])
        op.create_index(op.f('ix_user_sessions_id'), 'user_sessions', ['id'], unique=False)
        op.create_index(op.f('ix_user_sessions_session_id_hash'), 'user_sessions', ['session_id_hash'], unique=True)
        op.create_index(op.f('ix_user_sessions_user_uid'), 'user_sessions', ['user_uid'], unique=False)
    
    # 2. Create user_activities table
    if not has_table('user_activities'):
        op.create_table(
            'user_activities',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('activity_id', sa.String(length=36), nullable=False),
            sa.Column('user_uid', sa.String(length=8), nullable=False),
            sa.Column('session_id', sa.Integer(), nullable=True),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('resource_type', sa.String(length=50), nullable=True),
            sa.Column('resource_id', sa.String(length=100), nullable=True),
            sa.Column('method', sa.String(length=10), nullable=True),
            sa.Column('endpoint_hash', sa.String(length=64), nullable=True),
            sa.Column('status_code', sa.Integer(), nullable=True),
            sa.Column('response_time_ms', sa.Integer(), nullable=True),
            sa.Column('is_security_event', sa.Boolean(), nullable=True),
            sa.Column('severity', sa.String(length=20), nullable=True),
            sa.Column('ip_address', sa.Text(), nullable=True),
            sa.Column('user_agent_hash', sa.String(length=64), nullable=True),
            sa.Column('location', sa.Text(), nullable=True),
            sa.Column('old_value', sa.Text(), nullable=True),
            sa.Column('new_value', sa.Text(), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('activity_id', name='uq_user_activities_activity_id')
        )
        
        # Create indexes for user_activities
        op.create_index('idx_activity_user_time', 'user_activities', ['user_uid', 'created_at'])
        op.create_index('idx_activity_action_time', 'user_activities', ['action', 'created_at'])
        op.create_index('idx_security_events', 'user_activities', ['is_security_event', 'severity', 'created_at'])
        op.create_index(op.f('ix_user_activities_action'), 'user_activities', ['action'], unique=False)
        op.create_index(op.f('ix_user_activities_activity_id'), 'user_activities', ['activity_id'], unique=True)
        op.create_index(op.f('ix_user_activities_id'), 'user_activities', ['id'], unique=False)
        op.create_index(op.f('ix_user_activities_user_uid'), 'user_activities', ['user_uid'], unique=False)
    
    # 3. Create device_blacklist table
    if not has_table('device_blacklist'):
        op.create_table(
            'device_blacklist',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('device_fingerprint', sa.String(length=64), nullable=False),
            sa.Column('device_id_hash', sa.String(length=64), nullable=False),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('blocked_by', sa.String(length=8), nullable=False),
            sa.Column('blocked_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('is_permanent', sa.Boolean(), nullable=True),
            sa.Column('signature', sa.String(length=128), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('device_fingerprint', name='uq_device_blacklist_device_fingerprint')
        )
        
        # Create indexes for device_blacklist
        op.create_index(op.f('ix_device_blacklist_device_fingerprint'), 'device_blacklist', ['device_fingerprint'], unique=True)
        op.create_index(op.f('ix_device_blacklist_device_id_hash'), 'device_blacklist', ['device_id_hash'], unique=False)
        op.create_index(op.f('ix_device_blacklist_id'), 'device_blacklist', ['id'], unique=False)
    
    # 4. Create security_audit_logs table
    if not has_table('security_audit_logs'):
        op.create_table(
            'security_audit_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('event_id', sa.String(length=36), nullable=False),
            sa.Column('event_type', sa.String(length=50), nullable=False),
            sa.Column('severity', sa.String(length=20), nullable=False),
            sa.Column('user_uid', sa.String(length=8), nullable=True),
            sa.Column('details', sa.Text(), nullable=False),
            sa.Column('ip_address', sa.Text(), nullable=True),
            sa.Column('user_agent_hash', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('is_resolved', sa.Boolean(), nullable=True),
            sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('resolved_by', sa.String(length=8), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('event_id', name='uq_security_audit_logs_event_id')
        )
        
        # Create indexes for security_audit_logs
        op.create_index('idx_audit_severity_time', 'security_audit_logs', ['severity', 'created_at'])
        op.create_index('idx_audit_user_time', 'security_audit_logs', ['user_uid', 'created_at'])
        op.create_index(op.f('ix_security_audit_logs_event_id'), 'security_audit_logs', ['event_id'], unique=True)
        op.create_index(op.f('ix_security_audit_logs_event_type'), 'security_audit_logs', ['event_type'], unique=False)
        op.create_index(op.f('ix_security_audit_logs_id'), 'security_audit_logs', ['id'], unique=False)
    
    # 5. Add foreign key constraints
    op.create_foreign_key(
        'fk_user_sessions_user_uid',
        'user_sessions', 'users',
        ['user_uid'], ['user_uid'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_user_activities_user_uid',
        'user_activities', 'users',
        ['user_uid'], ['user_uid'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_user_activities_session_id',
        'user_activities', 'user_sessions',
        ['session_id'], ['id'],
        ondelete='SET NULL'
    )
    
    op.create_foreign_key(
        'fk_device_blacklist_blocked_by',
        'device_blacklist', 'users',
        ['blocked_by'], ['user_uid']
    )
    
    op.create_foreign_key(
        'fk_security_audit_logs_user_uid',
        'security_audit_logs', 'users',
        ['user_uid'], ['user_uid'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Drop user activity tables"""
    
    # Drop foreign keys first
    op.drop_constraint('fk_security_audit_logs_user_uid', 'security_audit_logs', type_='foreignkey')
    op.drop_constraint('fk_device_blacklist_blocked_by', 'device_blacklist', type_='foreignkey')
    op.drop_constraint('fk_user_activities_session_id', 'user_activities', type_='foreignkey')
    op.drop_constraint('fk_user_activities_user_uid', 'user_activities', type_='foreignkey')
    op.drop_constraint('fk_user_sessions_user_uid', 'user_sessions', type_='foreignkey')
    
    # Drop tables
    op.drop_table('security_audit_logs')
    op.drop_table('device_blacklist')
    op.drop_table('user_activities')
    op.drop_table('user_sessions')