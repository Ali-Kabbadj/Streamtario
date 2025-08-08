import asyncio
from typing import List, Tuple
from core.pydantic.addons.manifest import AddonManifest, Resource
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
        if ":" not in item_id:
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

        id_for_meta_lookup = addon_specific_id
        if item_type == "series":
            parts = addon_specific_id.split(":")
            if len(parts) >= 2 and all(p.isdigit() for p in parts[-2:]):
                id_for_meta_lookup = ":".join(parts[:-2])

        log_info(
            f"Primary attempt: Fetching meta for '{item_id}' (using lookup ID '{id_for_meta_lookup}') via provider '{routing_prefix}'"
        )

        manifest_urls = await self.profile_addon_manifest_provider.get_manifest_urls(
            profile_id
        )
        if not manifest_urls:
            return None

        all_manifests_futures = [self._fetch_manifest(url) for url in manifest_urls]
        all_manifests = await asyncio.gather(*all_manifests_futures)

        primary_manifest = next(
            (m for m in all_manifests if m and m.id == routing_prefix), None
        )

        if primary_manifest and primary_manifest.manifest_url:
            meta_response = await self.get_meta_use_case.execute(
                manifest_url=primary_manifest.manifest_url,
                item_id=id_for_meta_lookup,
                item_type=item_type,
            )
            if meta_response and meta_response.meta:
                log_info(f"Primary attempt SUCCEEDED for '{item_id}'")
                meta_response.meta.id = item_id
                return meta_response.meta
            log_warn(
                f"Primary attempt FAILED for '{routing_prefix}'. Initiating fallback search."
            )

        base_id_prefix = self._get_id_prefix(id_for_meta_lookup)
        if not base_id_prefix:
            log_warn(
                f"Could not determine standard prefix for ID '{id_for_meta_lookup}'. No fallbacks possible."
            )
            return None

        fallback_manifests: List[AddonManifest] = []
        for m in all_manifests:
            if not m or m.id == routing_prefix:
                continue

            for r in m.resources:
                if r.name != "meta":
                    continue

                supported_types = []
                if isinstance(r, Resource) and r.types:
                    supported_types = r.types
                elif m.types:
                    supported_types = m.types

                if item_type not in supported_types:
                    continue

                supported_prefixes = []
                if isinstance(r, Resource) and r.id_prefixes:
                    supported_prefixes = r.id_prefixes
                elif m.id_prefixes:
                    supported_prefixes = m.id_prefixes

                if not supported_prefixes or base_id_prefix in supported_prefixes:
                    fallback_manifests.append(m)
                    break

        if not fallback_manifests:
            log_warn(
                f"Primary provider for {routing_prefix} failed and no suitable fallback addons were found."
            )
            return None

        fallback_tasks = [
            self.get_meta_use_case.execute(
                manifest_url=m.manifest_url,
                item_id=id_for_meta_lookup,
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

        log_error(
            f"Primary provider and all fallbacks failed to return metadata for '{item_id}'."
        )
        return None
