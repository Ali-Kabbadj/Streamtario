import asyncio
from typing import List, Tuple
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.meta.meta import MetaItem
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info, log_error, log_warn
from .get_manifest import GetManifestUseCase
from .get_meta import GetMetaUseCase
from ..domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)


class FindAndGetMetaUseCase:
    """
    Finds the single responsible addon for a given federated item ID,
    strips the routing prefix, and then fetches its metadata.
    If the primary addon fails, it intelligently falls back to other
    installed addons that can provide the same metadata.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        get_meta_use_case: GetMetaUseCase,
        profile_addon_manifest_provider: IProfileAddonManifestProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.get_meta_use_case = get_meta_use_case
        self.profile_addon_manifest_provider = profile_addon_manifest_provider

    def _get_id_prefix(self, item_id: str) -> str | None:
        if not item_id or ":" not in item_id:
            if item_id.startswith("tt"):
                return "tt"
            return None
        return item_id.split(":", 1)[0]

    async def _fetch_manifest(self, url: str) -> AddonManifest | None:
        try:
            return await self.get_manifest_use_case.execute(url)
        except Exception:
            log_error(f"Failed to fetch or validate manifest at {url}")
            return None

    async def execute(
        self, profile_id: str, item_type: str, item_id: str
    ) -> MetaItem | None:

        if ":" not in item_id:
            raise ApiException(
                ApiErrorCode.VALIDATION_ERROR,
                details={
                    "reason": f"Item ID '{item_id}' is not in 'prefix:id' format."
                },
            )

        routing_prefix, addon_specific_id = item_id.split(":", 1)

        log_info(
            f"Primary attempt: Fetching meta for '{item_id}' using provider '{routing_prefix}'"
        )

        manifest_urls = await self.profile_addon_manifest_provider.get_manifest_urls(
            profile_id
        )
        if not manifest_urls:
            return None

        all_manifests = await asyncio.gather(
            *[self._fetch_manifest(url) for url in manifest_urls]
        )

        primary_manifest = next(
            (m for m in all_manifests if m and m.id == routing_prefix), None
        )

        if primary_manifest and primary_manifest.manifest_url:
            meta_response = await self.get_meta_use_case.execute(
                manifest_url=primary_manifest.manifest_url,
                item_id=addon_specific_id,
                item_type=item_type,
            )
            if meta_response and meta_response.meta:
                log_info(f"Primary attempt SUCCEEDED for '{item_id}'")
                meta_response.meta.id = item_id
                return meta_response.meta
            log_warn(
                f"Primary attempt FAILED for '{routing_prefix}'. Initiating fallback search."
            )

        base_id = addon_specific_id
        base_id_prefix = self._get_id_prefix(base_id)
        if not base_id_prefix:
            raise ApiException(
                ApiErrorCode.ADDON_NOT_FOUND,
                details={
                    "reason": f"Could not determine standard prefix for ID '{base_id}'"
                },
            )

        fallback_manifests = [
            m
            for m in all_manifests
            if m
            and m.id != routing_prefix
            and any(
                r.name == "meta"
                and item_type in (r.types or m.types)
                and (not r.id_prefixes or base_id_prefix in r.id_prefixes)
                for r in m.resources
            )
        ]

        if not fallback_manifests:
            raise ApiException(
                ApiErrorCode.ADDON_NOT_FOUND,
                details={
                    "reason": f"Primary provider for {routing_prefix} failed and no fallback addons were found."
                },
            )

        fallback_tasks = [
            self.get_meta_use_case.execute(
                manifest_url=m.manifest_url,
                item_id=base_id,
                item_type=item_type,
            )
            for m in fallback_manifests
            if m.manifest_url
        ]

        for future in asyncio.as_completed(fallback_tasks):
            meta_response = await future
            if meta_response and meta_response.meta:
                log_info(f"Fallback SUCCEEDED for '{item_id}'")
                meta_response.meta.id = item_id
                return meta_response.meta

        raise ApiException(
            ApiErrorCode.ADDON_NOT_FOUND,
            details={
                "reason": "Primary provider and all fallbacks failed to return metadata."
            },
        )
