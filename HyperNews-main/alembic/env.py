import importlib
import os
import sys
from logging.config import fileConfig

from sqlalchemy import create_engine, pool
from dotenv import load_dotenv
from alembic import context

# Project root: FastAPIProject6/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

load_dotenv()

# Import Base + URL after .env
from database import Base, DATABASE_URL  # noqa: E402

# Register all model modules on Base.metadata (for autogenerate)
for _m in (
    "models.user",
    "models.news",
    "models.engagement",
    "models.content",
    "models.base_location",
    "models.settings",
    "models.insorts",
    "models.settings",
):
    importlib.import_module(_m)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override INI: matches runtime `DATABASE_URL` and avoids special chars in alembic.ini
# config.set_main_option("sqlalchemy.url", DATABASE_URL)
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Prefer explicit URL; engine_from_config can mangle special characters in URLs
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
