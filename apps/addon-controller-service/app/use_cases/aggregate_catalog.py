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
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
        profile_addon_manifest_provider: IProfileAddonManifestProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider
        self.profile_addon_manifest_provider = profile_addon_manifest_provider

    async def _get_fetch_tasks_for_catalogs(
        self,
        catalogs_to_process: List[Tuple[AddonManifest, Catalog]],
        extra_props: Dict[str, Any],
    ) -> List[Tuple[asyncio.Task, str]]:
        tasks_with_prefixes = []
        for manifest, catalog in catalogs_to_process:
            if not manifest.manifest_url:
                continue

            base_url = manifest.manifest_url
            routing_prefix = manifest.id
            base_path = f"catalog/{catalog.type}/{catalog.id}"

            supported_names = (
                {e.name for e in catalog.extra} if catalog.extra else set()
            )

            valid_props = {}
            for k, v in extra_props.items():
                if v is not None and v != "all":
                    if k == "skip" and isinstance(v, int) and v > 0:
                        valid_props[k] = v
                    elif k != "skip" and k in supported_names:
                        valid_props[k] = v

            extra_string = ""
            if valid_props:
                param_list = sorted([f"{k}={v}" for k, v in valid_props.items()])
                param_string = "&".join(param_list)
                extra_string = f"/{param_string}"

            catalog_path = f"{base_path}{extra_string}.json"
            full_url = f"{base_url.rsplit('/', 1)[0]}/{catalog_path}"

            log_info(
                f"Queueing dynamically constructed catalog fetch: {full_url}",
                data={"addon": manifest.name, "catalog": catalog.name},
            )
            task = self.addon_provider.get(full_url, response_model=CatalogResponse)
            tasks_with_prefixes.append((asyncio.create_task(task), routing_prefix))

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

        fetched_manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        all_manifests: List[AddonManifest] = [m for m in fetched_manifests if m]

        catalogs_to_process: List[Tuple[AddonManifest, Catalog]] = []

        if manifest_id_filter and catalog_id:
            target_manifest = next(
                (m for m in all_manifests if m.id == manifest_id_filter), None
            )
            if target_manifest:
                target_catalog = next(
                    (
                        c
                        for c in target_manifest.catalogs
                        if c.id == catalog_id and c.type == item_type
                    ),
                    None,
                )
                if target_catalog:
                    catalogs_to_process.append((target_manifest, target_catalog))
        else:
            for manifest in all_manifests:
                for catalog in manifest.catalogs:
                    if catalog.type == item_type and not catalog.is_search:
                        if not catalog_id or catalog.id == catalog_id:
                            catalogs_to_process.append((manifest, catalog))

        tasks_with_prefixes = await self._get_fetch_tasks_for_catalogs(
            catalogs_to_process, extra_props
        )

        if not tasks_with_prefixes:
            return []

        tasks = [tp[0] for tp in tasks_with_prefixes]
        prefixes = [tp[1] for tp in tasks_with_prefixes]

        list_of_responses: List[Optional[CatalogResponse]] = await asyncio.gather(
            *tasks
        )
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
