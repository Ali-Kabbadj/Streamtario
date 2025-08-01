import redis.asyncio as redis
from typing import List
from app.domain.cache.i_profile_manifest_cache import IProfileManifestCache


def get_profile_cache_key(profile_id: str) -> str:
    return f"profile:{profile_id}:manifests"


class RedisProfileManifestCache(IProfileManifestCache):
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client

    async def get_manifests(self, profile_id: str) -> List[str]:
        key = get_profile_cache_key(profile_id)
        manifests = await self.redis_client.smembers(key)  # type: ignore
        return list(manifests)

    async def add_manifest(self, profile_id: str, manifest_url: str) -> None:
        key = get_profile_cache_key(profile_id)
        await self.redis_client.sadd(key, manifest_url)  # type: ignore

    async def remove_manifest(
        self, profile_id: str, manifest_id: str, manifest_url: str
    ) -> None:
        key = get_profile_cache_key(profile_id)
        await self.redis_client.srem(key, manifest_url)  # type: ignore
