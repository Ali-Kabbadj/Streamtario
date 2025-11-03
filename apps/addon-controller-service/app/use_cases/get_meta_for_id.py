import asyncio
from typing import Optional
from core.pydantic.meta.meta import MetaItem
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_warn, log_info, log_error
from ..domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)
from .get_manifest import GetManifestUseCase
from .get_meta import GetMetaUseCase


class GetMetaForIdUseCase:
    """
    Finds the specific addon manifest corresponding to a prefixed content ID
    and fetches metadata from only that addon.
    """

    def __init__(
        self,
        get_meta_use_case: GetMetaUseCase,
        get_manifest_use_case: GetManifestUseCase,
        profile_addon_manifest_provider: IProfileAddonManifestProvider,
    ):
        self.get_meta_use_case = get_meta_use_case
        self.get_manifest_use_case = get_manifest_use_case
        self.profile_addon_manifest_provider = profile_addon_manifest_provider

    async def execute(
        self, profile_id: str, content_id: str, item_type: str
    ) -> Optional[MetaItem]:
        parts = content_id.split(":", 1)
        if len(parts) < 2:
            log_warn(f"Invalid content_id format: '{content_id}'. It must be prefixed.")
            return None

        addon_prefix, item_id = parts

        manifest_urls = await self.profile_addon_manifest_provider.get_manifest_urls(
            profile_id
        )
        if not manifest_urls:
            log_warn(f"No manifest URLs found for profile_id: {profile_id}")
            return None

        manifest_tasks = [
            self.get_manifest_use_case.execute(url) for url in manifest_urls
        ]
        results = await asyncio.gather(*manifest_tasks, return_exceptions=True)

        found_manifest_url = None
        for i, result in enumerate(results):
            # Type guard: Safely skip over any exceptions that occurred.
            if isinstance(result, BaseException):
                log_error(
                    f"Failed to fetch manifest from URL: {manifest_urls[i]}",
                    data={"error": str(result)},
                )
                continue
            if result.id == addon_prefix:
                found_manifest_url = result.manifest_url
                break

        if not found_manifest_url:
            log_warn(
                f"No installed addon found with ID prefix '{addon_prefix}' for profile '{profile_id}'"
            )
            return None

        log_info(
            f"Found matching manifest for prefix '{addon_prefix}': {found_manifest_url}"
        )

        meta_response = await self.get_meta_use_case.execute(
            manifest_url=found_manifest_url, item_type=item_type, item_id=item_id
        )

        if meta_response and meta_response.meta:
            return meta_response.meta

        return None
