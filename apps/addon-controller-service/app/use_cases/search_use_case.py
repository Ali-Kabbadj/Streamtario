import asyncio
from typing import List, Dict, Tuple, Coroutine
from urllib.parse import quote
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    CatalogItem,
    AddonSearchResult,
)
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_info

from .get_manifest import GetManifestUseCase


class SearchUseCase:
    """
    Orchestrates a federated search by correctly identifying and querying
    all searchable catalogs within each installed addon's manifest.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

    async def execute(
        self, manifest_urls: List[str], search_query: str
    ) -> List[AddonSearchResult]:
        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        tasks_with_metadata: List[Tuple[Coroutine, str, str, str]] = []
        encoded_query = quote(search_query)

        for manifest in manifests:
            if not manifest or not manifest.manifest_url or not manifest.catalogs:
                continue

            base_url = manifest.manifest_url.rsplit("/", 1)[0]

            for catalog in manifest.catalogs:
                url = None

                is_dedicated_by_id = "search" in catalog.id.lower()
                is_dedicated_by_flag = catalog.is_search is True
                supports_search_extra = catalog.extra and any(
                    e.name == "search" for e in catalog.extra
                )

                if is_dedicated_by_id or is_dedicated_by_flag or supports_search_extra:
                    url = f"{base_url}/catalog/{catalog.type}/{catalog.id}/search={encoded_query}.json"
                    log_info(
                        "Queueing searchable catalog request",
                        data={"addon": manifest.name, "url": url},
                    )
                    task = self.addon_provider.get(url, response_model=CatalogResponse)
                    tasks_with_metadata.append(
                        (task, manifest.id, manifest.name, catalog.type)
                    )

        if not tasks_with_metadata:
            return []

        raw_results = await asyncio.gather(*[t[0] for t in tasks_with_metadata])

        aggregated: Dict[str, AddonSearchResult] = {}
        for response, task_metadata in zip(raw_results, tasks_with_metadata):
            _, manifest_id, addon_name, item_type = task_metadata
            if not response or not response.items:
                continue
            for item in response.items:
                item.id = f"{manifest_id}:{item.id}"
            if addon_name not in aggregated:
                aggregated[addon_name] = AddonSearchResult(
                    addonName=addon_name, resultsByType={}
                )
            if item_type not in aggregated[addon_name].results_by_type:
                aggregated[addon_name].results_by_type[item_type] = []
            aggregated[addon_name].results_by_type[item_type].extend(response.items)

        return list(aggregated.values())
