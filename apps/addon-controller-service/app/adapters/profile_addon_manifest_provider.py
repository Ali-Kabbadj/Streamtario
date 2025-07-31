from typing import List
from http_client_factory.client import ApiClient
from app.domain.cache.i_profile_manifest_cache import IProfileManifestCache
from app.domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)
from core.utils.logging import log_cache, log_http
from core.pydantic.api.internals import ManifestUrlsResponse


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
        cached_urls = await self.profile_manifest_cache.get_manifests(profile_id)
        if cached_urls:
            log_cache(f"Profile manifest cache HIT for profile: {profile_id}")
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
            for url in fresh_urls:
                await self.profile_manifest_cache.add_manifest(profile_id, url)
            log_cache(
                f"Successfully cached {len(fresh_urls)} manifest URLs for profile: {profile_id}"
            )

        return fresh_urls
