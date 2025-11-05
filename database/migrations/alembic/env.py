import asyncio
from logging.config import fileConfig
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import NullPool, engine_from_config
from sqlalchemy import pool
from alembic import context  # type: ignore
from sqlalchemy.ext.asyncio import AsyncEngine
from core.database.models.base import Base
from core.database.models.auth import account, addon


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")
load_dotenv(dotenv_path)


sys.path.insert(
    0,
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "packages", "python", "src"
        )
    ),
)


db_url = (
    f"postgresql+asyncpg://{os.environ['DB_USER']}:{os.environ['DB_PASSWORD']}@"
    f"{os.environ['DB_HOST']}:{os.environ['DB_PORT']}/{os.environ['DB_NAME']}"
)


def do_run_migrations(connection):
    """Helper function to be passed to run_sync."""
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    alembic_config = config.get_section("alembic")
    if alembic_config is None:
        raise RuntimeError(
            "Alembic configuration section '[alembic]' not found in alembic.ini"
        )

    alembic_config["sqlalchemy.url"] = db_url

    connectable = AsyncEngine(
        engine_from_config(
            alembic_config,
            prefix="sqlalchemy.",
            poolclass=NullPool,
            future=True,
        )
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
