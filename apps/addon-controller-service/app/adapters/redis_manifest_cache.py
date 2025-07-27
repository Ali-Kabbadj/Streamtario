import json
import redis.asyncio as redis
from typing import Optional
from app.domain.cache.i_manifest_cache import IManifestCache
from core.pydantic.addons.manifest import AddonManifest

MANIFEST_CACHE_KEY_PREFIX = "manifest:"
MANIFEST_CACHE_TTL_SECONDS = 60 * 60 * 24  # 24 hours


class RedisManifestCache(IManifestCache):
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client

    def _get_key(self, manifest_url: str) -> str:
        return f"{MANIFEST_CACHE_KEY_PREFIX}{manifest_url}"

    async def get(self, manifest_url: str) -> Optional[AddonManifest]:
        key = self._get_key(manifest_url)
        cached_data = await self.redis_client.get(key)
        if not cached_data:
            return None

        # The data is stored as a JSON string, so we parse it back.
        manifest_dict = json.loads(cached_data)
        return AddonManifest.model_validate(manifest_dict)

    async def set(self, manifest_url: str, manifest: AddonManifest) -> None:
        key = self._get_key(manifest_url)
        # Convert the Pydantic model to a JSON string for storage.
        data_to_cache = manifest.model_dump_json()
        # Set the value with our 24-hour expiration.
        await self.redis_client.set(key, data_to_cache, ex=MANIFEST_CACHE_TTL_SECONDS)
