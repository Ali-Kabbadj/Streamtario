from typing import List, Dict
from http_client_factory.client import ApiClient
from app.domain.cache.i_profile_manifest_cache import IProfileManifestCache
from app.domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)
from core.utils.logging import log_cache, log_http
from core.pydantic.api.internals import ManifestUrlsResponse
import asyncio

# A simple, in-memory cache for the duration of a single request-response cycle
request_local_cache: Dict[str, List[str]] = {}
request_local_lock = asyncio.Lock()


class ProfileAddonManifestProvider(IProfileAddonManifestProvider):
    def __init__(
        self,
        api_client: ApiClient,
        profile_manifest_cache: IProfileManifestCache,
        account_profile_service_url: str,
    ):
        self.api_client = api_client
        self.profile_manifest_cache = profile_manifest_cache
        self.account_profile_service_url = account_profile_service_url

    async def get_manifest_urls(self, profile_id: str) -> List[str]:
        async with request_local_lock:
            if profile_id in request_local_cache:
                log_cache(
                    f"Request-local manifest URL cache HIT for profile: {profile_id}"
                )
                return request_local_cache[profile_id]

        cached_urls = await self.profile_manifest_cache.get_manifests(profile_id)
        if cached_urls:
            log_cache(f"Profile manifest cache HIT for profile: {profile_id}")
            async with request_local_lock:
                request_local_cache[profile_id] = cached_urls
            return cached_urls

        log_cache(f"Profile manifest cache MISS for profile: {profile_id}")
        log_http(
            f"Fetching manifest URLs from account-profile-service for profile: {profile_id}"
        )

        fetch_url = f"{self.account_profile_service_url}/internal/v1/profiles/{profile_id}/manifest-urls"

        response = await self.api_client.get(
            fetch_url, response_model=ManifestUrlsResponse
        )

        if not response.ok or not response.data:
            log_cache(f"Failed to fetch manifest URLs for profile: {profile_id}")
            return []

        fresh_urls = response.data.manifest_urls

        if fresh_urls:
            await self.profile_manifest_cache.add_manifests(profile_id, fresh_urls)
            log_cache(
                f"Successfully cached {len(fresh_urls)} manifest URLs for profile: {profile_id}"
            )

        async with request_local_lock:
            request_local_cache[profile_id] = fresh_urls

        # This should be cleared after the request is done. We need a middleware for this.
        # For now, let's rely on the short-lived nature of the application instance in a serverless context.
        return fresh_urls
