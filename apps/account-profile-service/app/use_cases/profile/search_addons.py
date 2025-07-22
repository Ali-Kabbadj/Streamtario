import asyncio
from typing import Dict
from .discover_catalogs import DiscoverCatalogsUseCase
from .get_addon_catalog import GetAddonCatalogUseCase
from core.pydantic.catalog.catalog import AddonSearchResult
from core.utils.logging import log_error


class SearchAllAddonsUseCase:
    def __init__(
        self,
        discover_catalogs_use_case: DiscoverCatalogsUseCase,
        get_addon_catalog_use_case: GetAddonCatalogUseCase,
    ):
        self.discover_catalogs_use_case = discover_catalogs_use_case
        self.get_addon_catalog_use_case = get_addon_catalog_use_case

    async def execute(
        self, profile_id: str, query: str
    ) -> Dict[str, AddonSearchResult]:
        all_catalogs = await self.discover_catalogs_use_case.execute(profile_id)
        search_enabled_catalogs = [
            cat
            for cat in all_catalogs
            if any(prop.get("name") == "search" for prop in cat.extra_props)
        ]

        async def _fetch_search_results(catalog):
            try:
                catalog_data = await self.get_addon_catalog_use_case.execute(
                    profile_id=profile_id,
                    manifest_id=catalog.manifest_id,
                    catalog_type=catalog.catalog_type,
                    catalog_id=catalog.catalog_id,
                    extra_props={"search": query},
                )
                return (
                    catalog.manifest_id,
                    catalog.addon_name,
                    catalog.catalog_type,
                    catalog_data.items,
                )
            except Exception as e:
                log_error(
                    f"Search failed for addon '{catalog.manifest_id}'",
                    data={"error": str(e)},
                )
                return None

        tasks = [_fetch_search_results(cat) for cat in search_enabled_catalogs]
        results = await asyncio.gather(*tasks)

        grouped_results: Dict[str, AddonSearchResult] = {}
        for res in filter(None, results):
            manifest_id, addon_name, catalog_type, items = res
            if manifest_id not in grouped_results:
                grouped_results[manifest_id] = AddonSearchResult(
                    addonName=addon_name, resultsByType={}
                )
            grouped_results[manifest_id].results_by_type[catalog_type] = items

        return grouped_results
