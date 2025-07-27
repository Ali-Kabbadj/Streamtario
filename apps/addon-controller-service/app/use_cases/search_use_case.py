import asyncio
from typing import List, Dict, Any, AsyncGenerator
from urllib.parse import quote
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    AddonSearchResult,
)
from core.pydantic.api.error import ErrorResponse

# --- FIX: Remove obsolete imports for ApiClient and old exceptions ---
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info, log_error, log_warn
from .get_manifest import GetManifestUseCase

# --- FIX: Import the new cache dependency ---
from app.domain.cache.i_profile_manifest_cache import IProfileManifestCache


class SearchUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
        # --- FIX: Change dependencies to use the cache ---
        profile_manifest_cache: IProfileManifestCache,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider
        self.profile_manifest_cache = profile_manifest_cache

    # --- FIX: The _get_manifest_urls_for_profile method is now obsolete and can be deleted entirely ---

    async def execute(
        self, profile_id: str, search_query: str
    ) -> AsyncGenerator[AddonSearchResult, None]:

        # --- THIS IS THE PAYOFF ---
        # Instead of a slow, fragile network call, we make a single, fast call to our local cache.
        manifest_urls = await self.profile_manifest_cache.get_manifests(profile_id)

        if not manifest_urls:
            log_info(
                f"No addons installed or cached for profile {profile_id}, search will yield no results."
            )
            return

        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        # The rest of the search logic remains exactly the same, as it was already correct.
        task_to_metadata: Dict[asyncio.Task, Dict[str, Any]] = {}
        encoded_query = quote(search_query)

        for manifest in manifests:
            if not manifest or not manifest.manifest_url or not manifest.catalogs:
                continue

            base_url = manifest.manifest_url.rsplit("/", 1)[0]

            for catalog in manifest.catalogs:
                is_searchable = (
                    catalog.is_search
                    or "search" in catalog.id.lower()
                    or (
                        catalog.extra and any(e.name == "search" for e in catalog.extra)
                    )
                )
                if is_searchable:
                    url = f"{base_url}/catalog/{catalog.type}/{catalog.id}/search={encoded_query}.json"
                    task = asyncio.create_task(
                        self.addon_provider.get(url, response_model=CatalogResponse)
                    )
                    task_to_metadata[task] = {
                        "manifest_id": manifest.id,
                        "addon_name": manifest.name,
                        "item_type": catalog.type,
                    }

        if not task_to_metadata:
            log_info("No searchable catalogs found for this profile's addons.")
            return

        tasks_to_await = list(task_to_metadata.keys())

        try:
            while tasks_to_await:
                done, pending = await asyncio.wait(
                    tasks_to_await, return_when=asyncio.FIRST_COMPLETED
                )

                for future_task in done:
                    metadata = task_to_metadata[future_task]
                    addon_name = metadata.get("addon_name", "Unknown Addon")

                    try:
                        response: CatalogResponse | None = await future_task
                        if response and response.items:
                            manifest_id = metadata["manifest_id"]
                            item_type = metadata["item_type"]
                            for item in response.items:
                                item.id = f"{manifest_id}:{item.id}"
                            yield AddonSearchResult(
                                addonName=addon_name,
                                resultsByType={item_type: response.items},
                            )
                        else:
                            yield AddonSearchResult(
                                addonName=addon_name, resultsByType={}
                            )
                    except Exception as e:
                        yield AddonSearchResult(
                            addonName=addon_name,
                            error=ErrorResponse(
                                message=f"Addon request failed: {repr(e)}"
                            ),
                        )
                tasks_to_await = list(pending)
        except Exception as e:
            # This outer catch is for unexpected issues with the asyncio loop itself
            yield AddonSearchResult(
                addonName="System",
                error=ErrorResponse(message=f"Unexpected search error: {repr(e)}"),
            )
