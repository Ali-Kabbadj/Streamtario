import asyncio
from typing import List, Tuple
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.meta.meta import MetaItem
from domain_exceptions.exceptions import AddonProviderException, NotFoundException
from core.utils.logging import log_info, log_error
from .get_manifest import GetManifestUseCase
from .get_meta import GetMetaUseCase


class FindAndGetMetaUseCase:
    """
    Finds the single responsible addon for a given item ID and fetches its metadata.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        get_meta_use_case: GetMetaUseCase,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.get_meta_use_case = get_meta_use_case

    async def _fetch_manifest_and_pair_with_url(
        self, url: str
    ) -> Tuple[str, AddonManifest | None]:
        """Helper to fetch a manifest and return it with its original URL."""
        try:
            manifest = await self.get_manifest_use_case.execute(url)
            return url, manifest
        except Exception:
            log_error(f"Failed to fetch or validate manifest at {url}")
            return url, None

    async def execute(
        self, manifest_urls: List[str], item_type: str, item_id: str
    ) -> MetaItem | None:
        """Finds the correct addon and fetches metadata for a single item."""
        if ":" not in item_id:
            raise NotFoundException("Item with invalid ID format", item_id)

        item_prefix_part = item_id.split(":")[0]
        log_info(f"Looking for provider for meta with prefix: '{item_prefix_part}'")

        url_manifest_pairs = await asyncio.gather(
            *[self._fetch_manifest_and_pair_with_url(url) for url in manifest_urls]
        )

        responsible_manifest_url = None
        debug_lookups = {}
        for url, manifest in url_manifest_pairs:
            if not manifest:
                continue

            meta_resource = next(
                (res for res in manifest.resources if res.name == "meta"), None
            )
            if not meta_resource:
                debug_lookups[manifest.id] = "No 'meta' resource found."
                continue

            prefixes = meta_resource.id_prefixes or manifest.id_prefixes or []
            normalized_prefixes = [p.rstrip(":") for p in prefixes]
            debug_lookups[manifest.id] = (
                f"Checked against prefixes: {normalized_prefixes}"
            )

            if item_prefix_part in normalized_prefixes:
                log_info(f"Found responsible manifest: '{manifest.id}' at url {url}")
                responsible_manifest_url = url
                break

        if not responsible_manifest_url:
            raise AddonProviderException(
                looking_for=f"Metadata for prefix '{item_prefix_part}'",
                attempted_lookups=debug_lookups,
            )

        meta_response = await self.get_meta_use_case.execute(
            manifest_url=responsible_manifest_url,
            item_id=item_id,
            item_type=item_type,
        )

        return meta_response.meta if meta_response else None
