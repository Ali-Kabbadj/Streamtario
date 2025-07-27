import asyncio
from typing import List, Tuple
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.meta.meta import MetaItem
from domain_exceptions.exceptions import AddonProviderException, ValidationException
from core.utils.logging import log_info, log_error
from .get_manifest import GetManifestUseCase
from .get_meta import GetMetaUseCase


class FindAndGetMetaUseCase:
    """
    Finds the single responsible addon for a given federated item ID,
    strips the routing prefix, and then fetches its metadata.
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
        try:
            manifest = await self.get_manifest_use_case.execute(url)
            return url, manifest
        except Exception:
            log_error(f"Failed to fetch or validate manifest at {url}")
            return url, None

    async def execute(
        self, manifest_urls: List[str], item_type: str, item_id: str
    ) -> MetaItem | None:
        if ":" not in item_id:
            raise ValidationException(
                message=f"The provided item ID '{item_id}' is not in the required 'prefix:id' format.",
                ui_message="The requested item has an invalid identifier.",
                details={"invalid_id": item_id},
            )

        routing_prefix, addon_specific_id = item_id.split(":", 1)
        log_info(f"Looking for provider manifest with ID: '{routing_prefix}'")

        url_manifest_pairs = await asyncio.gather(
            *[self._fetch_manifest_and_pair_with_url(url) for url in manifest_urls]
        )

        responsible_manifest_url = None
        for url, manifest in url_manifest_pairs:
            if manifest and manifest.id == routing_prefix:
                log_info(f"Found responsible manifest: '{manifest.id}' at url {url}")
                responsible_manifest_url = url
                break

        if not responsible_manifest_url:
            raise AddonProviderException(
                looking_for=f"Metadata for an addon with ID '{routing_prefix}'",
                attempted_lookups={
                    "manifest_urls": manifest_urls,
                    "looking_for_id": routing_prefix,
                },
            )

        meta_response = await self.get_meta_use_case.execute(
            manifest_url=responsible_manifest_url,
            item_id=addon_specific_id,
            item_type=item_type,
        )

        if meta_response and meta_response.meta:
            meta_response.meta.id = item_id
            return meta_response.meta

        return None
