import asyncio
from typing import Callable, List, Dict, Any
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.providers.i_addon_provider import IAddonProvider
from app.use_cases.profile.discover_catalogs import DiscoverCatalogsUseCase
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    DiscoveredCatalog,
    CatalogItem,
)
from domain_exceptions.exceptions import NotFoundException
from core.utils.logging import log_info, log_error


class GetUniversalCatalogUseCase:
    """
    Correctly orchestrates fetching paginated catalog content from multiple addons,
    returning a single, unified, and properly paginated feed that STRICTLY
    adheres to all user-selected filters.
    """

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
        discover_catalogs_use_case: DiscoverCatalogsUseCase,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider
        self.discover_catalogs_use_case = discover_catalogs_use_case

    async def execute(self, profile_id: str, params: Dict[str, Any]) -> CatalogResponse:

        # Discover all available catalogs just once.
        all_discovered_catalogs = await self.discover_catalogs_use_case.execute(
            profile_id
        )

        target_catalogs: List[DiscoveredCatalog] = []

        # Extract user's explicit filter choices from the frontend.
        filter_type = params.get("type")
        filter_category = params.get("name")  # e.g., "Popular"
        filter_provider_id = params.get("manifestId")

        # Gatekeeper: If the user hasn't selected the basic filters, we have nothing to show.
        if not filter_type or not filter_category:
            return CatalogResponse(metas=[])

        log_info(
            f"Filtering for Provider='{filter_provider_id or 'All'}', Type='{filter_type}', Category='{filter_category}'"
        )

        # --- THE BULLETPROOF LOGIC FOR SELECTING TARGET CATALOGS ---
        for catalog in all_discovered_catalogs:

            # 1. If a specific provider is chosen, immediately reject any catalog from other providers.
            if filter_provider_id and catalog.manifest_id != filter_provider_id:
                continue

            # 2. The catalog's category name MUST exactly match the user's selection.
            if catalog.catalog_name != filter_category:
                continue

            # 3. This is the most critical check that was failing before.
            #    The catalog's own declared 'type' MUST exactly match the user's selected 'type'.
            #    This will correctly select Cinemeta's "movie" catalog and reject its "series" catalog.
            if catalog.catalog_type != filter_type:
                continue

            # If a catalog passes all these strict checks, it is a valid target.
            target_catalogs.append(catalog)

        if not target_catalogs:
            log_info("No target catalogs found matching the precise filter criteria.")
            return CatalogResponse(metas=[])

        # --- The rest of the logic for fetching and interleaving ---
        async def _fetch_slice_for_catalog(
            catalog: DiscoveredCatalog,
        ) -> List[CatalogItem]:
            props_for_this_addon = {"skip": params.get("skip", "0")}
            for extra_prop_def in catalog.extra_props:
                prop_name = extra_prop_def.get("name")
                if prop_name and prop_name in params:
                    props_for_this_addon[prop_name] = params[prop_name]

            try:
                # Get the manifest_url from the database.
                async with self.uow_factory() as uow:
                    profile = await uow.profiles.get_by_id(profile_id)
                    if not profile:
                        return []
                    addon_orm = next(
                        (
                            a
                            for a in profile.installed_addons
                            if a.manifest_id == catalog.manifest_id
                        ),
                        None,
                    )
                    if not addon_orm:
                        return []

                response = await self.addon_provider.get_catalog(
                    manifest_url=addon_orm.manifest_url,
                    catalog_type=catalog.catalog_type,
                    catalog_id=catalog.catalog_id,
                    extra_props=props_for_this_addon,
                )

                return response.items if response else []
            except Exception as e:
                log_error(
                    f"Failed to fetch catalog slice for {catalog.catalog_id}",
                    data={"error": str(e)},
                )
                return []

        tasks = [_fetch_slice_for_catalog(cat) for cat in target_catalogs]
        list_of_item_lists: List[List[CatalogItem]] = await asyncio.gather(*tasks)

        # Interleave and deduplicate the results.
        combined_items: List[CatalogItem] = []
        if list_of_item_lists:
            seen_ids = set()
            max_len = max((len(res) for res in list_of_item_lists), default=0)
            for i in range(max_len):
                for item_list in list_of_item_lists:
                    if i < len(item_list):
                        item = item_list[i]
                        if item.id not in seen_ids:
                            combined_items.append(item)
                            seen_ids.add(item.id)

        return CatalogResponse(metas=combined_items)
