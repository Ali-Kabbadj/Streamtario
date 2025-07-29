import asyncio
from typing import List
from core.pydantic.addons.manifest import AddonManifest, Catalog
from core.pydantic.catalog.catalog import DiscoveredCatalog
from .get_manifest import GetManifestUseCase
from core.utils.logging import log_error, log_info


class DiscoverCatalogsUseCase:
    """
    Takes a list of manifest URLs, fetches them, and transforms their catalog
    listings into a UI-friendly format. This is the primary mechanism for
    powering dynamic UI elements like genre or content-type dropdowns.
    """

    def __init__(self, get_manifest_use_case: GetManifestUseCase):
        self.get_manifest_use_case = get_manifest_use_case

    def _is_search_only_catalog(self, catalog: Catalog) -> bool:
        """Determines if a catalog is exclusively for searching."""
        if catalog.is_search:
            return True
        if catalog.extra:
            for prop in catalog.extra:
                if prop.name == "search" and prop.is_required:
                    return True
        return False

    async def _fetch_manifest(self, url: str) -> AddonManifest | None:
        try:
            return await self.get_manifest_use_case.execute(url)
        except Exception as e:
            log_error(
                f"Failed to fetch or validate manifest at {url}", data={"error": str(e)}
            )
            return None

    async def execute(self, manifest_urls: List[str]) -> List[DiscoveredCatalog]:
        manifests = await asyncio.gather(
            *[self._fetch_manifest(url) for url in manifest_urls]
        )

        discovered_catalogs: List[DiscoveredCatalog] = []
        for manifest in manifests:
            if not manifest or not manifest.catalogs:
                continue

            for catalog in manifest.catalogs:
                if self._is_search_only_catalog(catalog):
                    continue

                discovered_catalogs.append(
                    DiscoveredCatalog(
                        addonName=manifest.name,
                        manifestId=manifest.id,
                        catalogId=catalog.id,
                        catalogName=catalog.name,
                        catalogType=catalog.type,
                        supportedItemTypes=manifest.types,
                        extraProps=(
                            [prop.model_dump(by_alias=True) for prop in catalog.extra]
                            if catalog.extra
                            else []
                        ),
                    )
                )

        log_info(f"Discovered {len(discovered_catalogs)} browsable catalogs.")
        return discovered_catalogs
