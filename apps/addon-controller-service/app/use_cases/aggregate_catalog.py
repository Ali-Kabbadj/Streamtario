import asyncio
from typing import List, Dict, Any, Optional
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import CatalogResponse, CatalogItem
from core.utils.logging import log_info, log_warn
from .get_manifest import GetManifestUseCase


class AggregateCatalogUseCase:
    """
    Orchestrates fetching, filtering, and interleaving catalog data from multiple addon manifests.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

    async def execute(
        self,
        manifest_urls: List[str],
        item_type: str,
        catalog_id: str,
        extra_props: Dict[str, Any],
        filter_by_type: Optional[str] = None,
    ) -> List[CatalogItem]:
        """Fetches and interleaves catalog items from all relevant addons."""
        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        tasks = []
        for manifest in manifests:
            if not manifest:
                continue

            manifest_base_url = next(
                (url for url in manifest_urls if manifest.id in url), None
            )
            if not manifest_base_url:
                continue

            for catalog in manifest.catalogs:
                # CORRECTED: The core logic now uses catalog.id for matching
                if catalog.type == item_type and catalog.id == catalog_id:
                    extra_args_list = [
                        f"{k}={v}" for k, v in extra_props.items() if v is not None
                    ]
                    extra_args_str = "&".join(extra_args_list)
                    catalog_path = f"catalog/{catalog.type}/{catalog.id}"
                    if extra_args_str:
                        catalog_path += f"/{extra_args_str}"

                    full_url = (
                        f"{manifest_base_url.rsplit('/', 1)[0]}/{catalog_path}.json"
                    )
                    log_info(f"Queueing catalog fetch from: {full_url}")
                    tasks.append(
                        self.addon_provider.get(
                            full_url, response_model=CatalogResponse
                        )
                    )

        list_of_responses: List[CatalogResponse | None] = await asyncio.gather(*tasks)

        list_of_item_lists = []
        for res in list_of_responses:
            if res and hasattr(res, "items") and res.items is not None:
                list_of_item_lists.append(res.items)
            elif res:
                log_warn(
                    "Response received but contains no 'items' attribute.", data=res
                )
            else:
                log_warn("A catalog fetch task returned None.")

        combined_items: List[CatalogItem] = []
        seen_ids = set()
        if list_of_item_lists:
            max_len = max(
                (len(item_list) for item_list in list_of_item_lists), default=0
            )
            for i in range(max_len):
                for item_list in list_of_item_lists:
                    if i < len(item_list):
                        item = item_list[i]
                        if item.id not in seen_ids:
                            combined_items.append(item)
                            seen_ids.add(item.id)

        log_info(f"Aggregated a total of {len(combined_items)} items before filtering.")

        # NEW: The crucial filtering step
        if filter_by_type:
            filtered_items = [
                item for item in combined_items if item.type == filter_by_type
            ]
            log_info(
                f"Returning {len(filtered_items)} items after filtering by type '{filter_by_type}'."
            )
            return filtered_items

        return combined_items
