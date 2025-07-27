import redis.asyncio as redis
from typing import List
from app.domain.cache.i_profile_manifest_cache import IProfileManifestCache


# Define a consistent key schema for our cache
def get_profile_cache_key(profile_id: str) -> str:
    return f"profile:{profile_id}:manifests"


class RedisProfileManifestCache(IProfileManifestCache):
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client

    async def get_manifests(self, profile_id: str) -> List[str]:
        key = get_profile_cache_key(profile_id)
        manifests = await self.redis_client.smembers(key)
        return list(manifests)

    async def add_manifest(self, profile_id: str, manifest_url: str) -> None:
        key = get_profile_cache_key(profile_id)
        await self.redis_client.sadd(key, manifest_url)

    async def remove_manifest(
        self, profile_id: str, manifest_id: str, manifest_url: str
    ) -> None:
        # The AddonUninstalledEvent gives us the manifest_id. For now, we only store
        # the URL. In a future, more complex system, we might store a hash of
        # manifest_id -> manifest_url. For now, we assume the URL is what we need to remove.
        # This is a limitation we accept for now. A better way would be to re-fetch all
        # manifests for the profile, but that would require an HTTP call.
        # Let's assume for now the uninstall event will also provide the URL.
        # EDIT: Let's make our event richer to solve this.
        key = get_profile_cache_key(profile_id)
        await self.redis_client.srem(key, manifest_url)
