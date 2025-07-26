import asyncio
from typing import List, Dict, Any, Optional, Tuple
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import CatalogResponse, CatalogItem
from core.pydantic.addons.manifest import AddonManifest, Catalog
from core.utils.logging import log_info, log_warn
from .get_manifest import GetManifestUseCase


class AggregateCatalogUseCase:
    """
    Orchestrates fetching catalog data. If a manifest_id_filter is provided,
    it will only query that specific addon. Otherwise, it aggregates from all.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

    async def _get_fetch_tasks_for_manifest(
        # ... (this helper function has no changes)
        self,
        manifest: AddonManifest,
        base_url: str,
        item_type: str,
        catalog_id: Optional[str],
        extra_props: Dict[str, Any],
    ) -> List[Tuple[asyncio.Task, str]]:
        tasks_with_prefixes = []
        routing_prefix = manifest.id
        catalogs_to_query: List[Catalog] = []

        if catalog_id:
            found_catalog = next(
                (
                    c
                    for c in manifest.catalogs
                    if c.type == item_type and c.id == catalog_id
                ),
                None,
            )
            if found_catalog:
                catalogs_to_query.append(found_catalog)
        else:
            catalogs_to_query = [
                c for c in manifest.catalogs if c.type == item_type and not c.is_search
            ]

        for catalog in catalogs_to_query:
            extra_path_segment = ""
            if extra_props:
                extra_args = [
                    f"{k}={v}" for k, v in extra_props.items() if v is not None
                ]
                if extra_args:
                    extra_path_segment = f"/{'&'.join(extra_args)}"

            catalog_path = (
                f"catalog/{catalog.type}/{catalog.id}{extra_path_segment}.json"
            )
            full_url = f"{base_url.rsplit('/', 1)[0]}/{catalog_path}"

            log_info(
                f"Queueing catalog fetch from: {full_url}",
                data={"addon": manifest.name},
            )
            task = self.addon_provider.get(full_url, response_model=CatalogResponse)
            tasks_with_prefixes.append((task, routing_prefix))
        return tasks_with_prefixes

    async def execute(
        self,
        manifest_urls: List[str],
        item_type: str,
        catalog_id: Optional[str],
        manifest_id_filter: Optional[str],  # <-- NEW ARGUMENT
        extra_props: Dict[str, Any],
        filter_by_type: Optional[str] = None,
    ) -> List[CatalogItem]:
        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        manifests_to_process = manifests
        if manifest_id_filter:
            manifests_to_process = [
                m for m in manifests if m and m.id == manifest_id_filter
            ]
            if not manifests_to_process:
                log_warn(
                    f"Provider filter applied, but no installed addon with ID '{manifest_id_filter}' was found."
                )
                return []

        tasks_with_prefixes: List[Tuple[asyncio.Task, str]] = []
        # Use the potentially filtered list of manifests
        for manifest in manifests_to_process:
            if not manifest or not manifest.manifest_url:
                continue

            manifest_tasks = await self._get_fetch_tasks_for_manifest(
                manifest=manifest,
                base_url=manifest.manifest_url,
                item_type=item_type,
                catalog_id=catalog_id,
                extra_props=extra_props,
            )
            tasks_with_prefixes.extend(manifest_tasks)

        if not tasks_with_prefixes:
            return []

        tasks = [tp[0] for tp in tasks_with_prefixes]
        prefixes = [tp[1] for tp in tasks_with_prefixes]

        list_of_responses: List[CatalogResponse | None] = await asyncio.gather(*tasks)
        responses_with_prefixes = zip(list_of_responses, prefixes)

        list_of_item_lists = []
        for response, prefix in responses_with_prefixes:
            if response and response.items:
                for item in response.items:
                    item.id = f"{prefix}:{item.id}"
                list_of_item_lists.append(response.items)

        combined_items: List[CatalogItem] = []
        seen_ids = set()
        if list_of_item_lists:
            max_len = max((len(lst) for lst in list_of_item_lists), default=0)
            for i in range(max_len):
                for item_list in list_of_item_lists:
                    if i < len(item_list):
                        item = item_list[i]
                        if item.id not in seen_ids:
                            combined_items.append(item)
                            seen_ids.add(item.id)

        if filter_by_type:
            return [item for item in combined_items if item.type == filter_by_type]

        return combined_items
