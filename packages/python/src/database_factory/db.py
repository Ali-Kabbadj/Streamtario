from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from fastapi_factory.config import BaseAppSettings
from typing import AsyncGenerator


def create_db_engine(settings: BaseAppSettings):
    """Creates an async SQLAlchemy engine from the application settings."""
    if not all(
        [
            settings.DB_USER,
            settings.DB_PASSWORD,
            settings.DB_HOST,
            settings.DB_PORT,
            settings.DB_NAME,
        ]
    ):
        raise ValueError("Database connection settings are not fully configured.")

    db_url = (
        f"postgresql+asyncpg://{settings.DB_USER}:{settings.DB_PASSWORD}@"
        f"{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    )
    return create_async_engine(
        db_url, echo=False
    )  # Set echo=True to log all SQL statements


def create_db_session_factory(engine) -> async_sessionmaker[AsyncSession]:
    """Creates a session factory for the given engine."""
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db_session(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to yield a database session from a session factory."""
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
