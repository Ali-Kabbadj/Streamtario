import asyncio
from typing import List, Dict, Any, Optional, Tuple
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import CatalogResponse, CatalogItem
from core.pydantic.addons.manifest import AddonManifest, Catalog
from core.utils.logging import log_info, log_warn
from .get_manifest import GetManifestUseCase
from ..domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)


class AggregateCatalogUseCase:
    """
    Orchestrates fetching catalog data. It intelligently filters addons
    based on the selected criteria before making any external requests.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
        profile_addon_manifest_provider: IProfileAddonManifestProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider
        self.profile_addon_manifest_provider = profile_addon_manifest_provider

    def _is_manifest_relevant(
        self,
        manifest: AddonManifest,
        item_type: str,
        catalog_id: Optional[str],
        extra_props: Dict[str, Any],
    ) -> bool:
        """
        Checks if a manifest has catalogs that can satisfy the given filter criteria.
        It deliberately ignores pagination properties like 'skip'.
        """
        filtering_props = extra_props.copy()
        filtering_props.pop("skip", None)

        for catalog in manifest.catalogs:
            if catalog.type != item_type:
                continue
            if catalog_id and catalog.id != catalog_id:
                continue

            if not filtering_props:
                return True

            all_props_supported = True
            for key, value in filtering_props.items():
                prop_is_supported_in_catalog = False
                if catalog.extra:
                    for extra_option in catalog.extra:
                        if extra_option.name == key:
                            if (
                                extra_option.options is None
                                or value in extra_option.options
                            ):
                                prop_is_supported_in_catalog = True
                                break
                if not prop_is_supported_in_catalog:
                    all_props_supported = False
                    break

            if all_props_supported:
                return True

        return False

    async def _get_fetch_tasks_for_manifest(
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
        profile_id: str,
        item_type: str,
        catalog_id: Optional[str],
        manifest_id_filter: Optional[str],
        extra_props: Dict[str, Any],
        filter_by_type: Optional[str] = None,
    ) -> List[CatalogItem]:
        manifest_urls = await self.profile_addon_manifest_provider.get_manifest_urls(
            profile_id
        )
        if not manifest_urls:
            return []

        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        manifests_to_process: List[AddonManifest] = []

        if manifest_id_filter:
            manifests_to_process = [
                m for m in manifests if m and m.id == manifest_id_filter
            ]
        else:
            for m in manifests:
                if not m:
                    continue
                if catalog_id:
                    if any(
                        c.id == catalog_id and c.type == item_type for c in m.catalogs
                    ):
                        manifests_to_process.append(m)
                elif self._is_manifest_relevant(m, item_type, catalog_id, extra_props):
                    manifests_to_process.append(m)

        if not manifests_to_process:
            log_warn(
                "No installed addons match the specified filter criteria.",
                data={
                    "item_type": item_type,
                    "catalog_id": catalog_id,
                    "extra_props": extra_props,
                },
            )
            return []

        log_info(
            f"Filtered to {len(manifests_to_process)} relevant addons for query.",
            data={"addon_ids": [m.id for m in manifests_to_process]},
        )

        tasks_with_prefixes: List[Tuple[asyncio.Task, str]] = []
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
