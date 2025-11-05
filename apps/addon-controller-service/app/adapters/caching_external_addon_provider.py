import json
import redis.asyncio as redis
from typing import Type, TypeVar, Optional
from pydantic import BaseModel
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.utils.logging import log_cache

T = TypeVar("T", bound="BaseModel")

QUERY_CACHE_TTL_SECONDS = 60 * 15
QUERY_CACHE_KEY_PREFIX = "addon-query:"


class CachingExternalAddonProvider(IExternalAddonProvider):
    """
    A decorator that adds a caching layer to an existing IExternalAddonProvider.
    """

    def __init__(
        self, decorated_provider: IExternalAddonProvider, redis_client: redis.Redis
    ):
        self.decorated_provider = decorated_provider
        self.redis_client = redis_client

    def _get_key(self, url: str) -> str:
        return f"{QUERY_CACHE_KEY_PREFIX}{url}"

    async def get(
        self, url: str, response_model: Type[T], timeout: Optional[float] = None
    ) -> T | None:
        key = self._get_key(url)

        try:
            cached_data = await self.redis_client.get(key)
            if cached_data:
                return response_model.model_validate_json(cached_data)
        except Exception as e:
            log_cache(f"Cache GET failed for URL: {url}, Error: {e}")

        fresh_data = await self.decorated_provider.get(
            url, response_model, timeout=timeout
        )

        if fresh_data:
            try:
                data_to_cache = fresh_data.model_dump_json(by_alias=True)
                await self.redis_client.set(
                    key, data_to_cache, ex=QUERY_CACHE_TTL_SECONDS
                )
            except Exception as e:
                log_cache(f"Cache SET failed for URL: {url}, Error: {e}")

        return fresh_data

    async def get_raw_text(self, url: str) -> str | None:
        return await self.decorated_provider.get_raw_text(url)
