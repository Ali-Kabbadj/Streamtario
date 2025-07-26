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

    Intended UI Workflow:
    1.  The UI calls the 'discoverable_catalogs' GraphQL query for a user profile.
    2.  This use case returns a flat list of all available, non-search catalogs
        from all of the user's installed addons.
    3.  Each item in the list (`DiscoveredCatalog`) contains:
        - `addonName` and `manifestId`: To allow the UI to group catalogs by
          their source addon or present a provider-switching dropdown ("All", "Provider A", etc.).
        - `catalogId`, `catalogName`, `catalogType`: To render the primary
          navigation (e.g., a "Movies" tab with a "Top" catalog).
        - `extraProps`: This is the crucial part for dynamic filters. It's a
          list of objects describing properties like `genre`. Each object
          details its `name`, if it's `isRequired`, and a list of
          possible `options` (e.g., ["Action", "Comedy", "Drama"]).
    4.  When a user interacts with the UI (e.g., selects the "Top Movies" catalog),
        the UI uses the `catalogId` and `catalogType` along with any selected
        `extraProps` values to call the 'catalog' GraphQL query.
    """

    def __init__(self, get_manifest_use_case: GetManifestUseCase):
        self.get_manifest_use_case = get_manifest_use_case

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
                if catalog.is_search or (
                    catalog.extra_required and "search" in catalog.extra_required
                ):
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
