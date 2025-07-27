import redis.asyncio as redis
from fastapi_factory.config import BaseAppSettings


def create_redis_client(settings: BaseAppSettings) -> redis.Redis:
    """
    Creates an async Redis client from the application settings.
    """
    if not settings.REDIS_HOST or not settings.REDIS_PORT:
        raise ValueError("Redis connection settings are not fully configured.")

    return redis.Redis(
        host=settings.REDIS_HOST, port=settings.REDIS_PORT, db=0, decode_responses=True
    )
