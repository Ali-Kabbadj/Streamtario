import asyncio
import json
from typing import AsyncGenerator
from .discover_catalogs import DiscoverCatalogsUseCase
from .get_addon_catalog import GetAddonCatalogUseCase
from core.pydantic.catalog.catalog import AddonSearchResult, DiscoveredCatalog
from core.utils.logging import log_error


class StreamSearchCatalogCase:
    def __init__(
        self,
        discover_catalogs_use_case: DiscoverCatalogsUseCase,
        get_addon_catalog_use_case: GetAddonCatalogUseCase,
    ):
        self.discover_catalogs_use_case = discover_catalogs_use_case
        self.get_addon_catalog_use_case = get_addon_catalog_use_case

    async def execute(self, profile_id: str, query: str) -> AsyncGenerator[str, None]:
        all_catalogs = await self.discover_catalogs_use_case.execute(profile_id)
        search_enabled_catalogs = [
            cat
            for cat in all_catalogs
            if any(prop.get("name") == "search" for prop in cat.extra_props)
        ]

        async def _fetch_and_format(catalog: DiscoveredCatalog):
            try:
                catalog_data = await self.get_addon_catalog_use_case.execute(
                    profile_id=profile_id,
                    manifest_id=catalog.manifest_id,
                    catalog_type=catalog.catalog_type,
                    catalog_id=catalog.catalog_id,
                    extra_props={"search": query},
                )
                single_group = {
                    catalog.manifest_id: AddonSearchResult(
                        addonName=catalog.addon_name,
                        resultsByType={catalog.catalog_type: catalog_data.items},
                    )
                }
                return single_group
            except Exception as e:
                log_error(
                    f"Search failed for addon '{catalog.manifest_id}'",
                    data={"error": str(e)},
                )
                return None

        tasks = [_fetch_and_format(cat) for cat in search_enabled_catalogs]
        for completed_task in asyncio.as_completed(tasks):
            result_group = await completed_task
            if result_group:
                manifest_id, addon_result_model = next(iter(result_group.items()))
                final_json_obj = {
                    manifest_id: addon_result_model.model_dump(by_alias=True)
                }
                json_data = json.dumps(final_json_obj)
                yield f"event: search_result\ndata: {json_data}\n\n"
