import asyncio
from typing import List, Dict, Tuple

from pydantic import BaseModel
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import CatalogResponse, CatalogItem
from core.pydantic.addons.manifest import Catalog
from .get_manifest import GetManifestUseCase


class HomeContentRow(BaseModel):
    title: str
    items: List[CatalogItem]


class HomeAddonSection(BaseModel):
    addon_name: str
    content: List[HomeContentRow]


class GetHomeCatalogsUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

    def _is_default_catalog(self, catalog: Catalog) -> bool:
        name = catalog.name.lower()
        return "popular" in name or "top" in name or "trending" in name

    async def execute(self, manifest_urls: List[str]) -> List[HomeAddonSection]:
        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        tasks_to_run: Dict[str, Tuple[asyncio.Task, str]] = {}

        valid_manifests = [m for m in manifests if m is not None]

        for manifest in valid_manifests:
            if not manifest.manifest_url:
                continue

            base_url = manifest.manifest_url.rsplit("/", 1)[0]
            grouped_by_type = {}
            for c in manifest.catalogs:
                if c.is_search:
                    continue
                if c.type not in grouped_by_type:
                    grouped_by_type[c.type] = []
                grouped_by_type[c.type].append(c)

            for cat_type, catalogs in grouped_by_type.items():
                default_catalog = next(
                    (c for c in catalogs if self._is_default_catalog(c)), catalogs[0]
                )

                catalog_path = (
                    f"catalog/{default_catalog.type}/{default_catalog.id}.json"
                )
                full_url = f"{base_url}/{catalog_path}"
                task_key = f"{manifest.id}-{cat_type}"

                coro = self.addon_provider.get(full_url, response_model=CatalogResponse)
                tasks_to_run[task_key] = (asyncio.create_task(coro), manifest.name)

        if not tasks_to_run:
            return []

        task_keys = list(tasks_to_run.keys())
        tasks = [tasks_to_run[key][0] for key in task_keys]
        results = await asyncio.gather(*tasks)

        processed_data: Dict[str, HomeAddonSection] = {}

        for i, result in enumerate(results):
            if not result or not result.items:
                continue

            task_key = task_keys[i]
            manifest_id, cat_type = task_key.split("-", 1)
            addon_name = tasks_to_run[task_key][1]

            if addon_name not in processed_data:
                processed_data[addon_name] = HomeAddonSection(
                    addon_name=addon_name, content=[]
                )

            for item in result.items:
                item.id = f"{manifest_id}:{item.id}"

            processed_data[addon_name].content.append(
                HomeContentRow(title=cat_type, items=result.items)
            )

        return list(processed_data.values())
