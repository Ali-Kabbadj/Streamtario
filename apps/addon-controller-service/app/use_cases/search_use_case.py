import asyncio
from typing import List, Dict, Any, AsyncGenerator
from urllib.parse import quote
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    CatalogItem,
    AddonSearchResult,
)
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.domain.profile import Profile
from core.pydantic.api.error import ErrorResponse
from http_client_factory.client import ApiClient
from api_contract.responses import ApiResponse
from domain_exceptions.exceptions import NotFoundException, ApiException

from core.utils.logging import log_info, log_error, log_warn


from .get_manifest import GetManifestUseCase


class SearchUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
        api_client: ApiClient,
        account_service_url: str,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider
        self.api_client = api_client
        self.account_service_url = account_service_url

    async def _get_manifest_urls_for_profile(self, profile_id: str) -> List[str]:
        if not self.account_service_url:
            raise ApiException(
                "ACCOUNT_PROFILE_SERVICE_URL URL is not configured.", status_code=500
            )

        url = f"{self.account_service_url}/api/v1/profiles/{profile_id}"

        api_response: ApiResponse[Profile] = await self.api_client.get(
            url, response_model=Profile
        )

        if not api_response.ok or api_response.data is None:
            raise NotFoundException("Profile", profile_id)

        return api_response.data.manifest_urls

    async def execute(
        self, profile_id: str, search_query: str
    ) -> AsyncGenerator[AddonSearchResult, None]:

        manifest_urls = []
        try:
            manifest_urls = await self._get_manifest_urls_for_profile(profile_id)
        except NotFoundException:
            log_warn(
                f"Search initiated for a profile that does not exist: {profile_id}. Subscription will end."
            )
            return
        except Exception as e:
            log_error(
                f"An unexpected error occurred while fetching profile {profile_id} for search.",
                data={"error": str(e)},
            )
            return

        if not manifest_urls:
            log_info(
                f"No addons installed for profile {profile_id}, search will yield no results."
            )
            return

        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        task_to_metadata: Dict[asyncio.Task, Dict[str, Any]] = (
            {}
        )  # Use asyncio.Task as key
        encoded_query = quote(search_query)

        for manifest in manifests:
            if not manifest or not manifest.manifest_url or not manifest.catalogs:
                continue

            base_url = manifest.manifest_url.rsplit("/", 1)[0]

            for catalog in manifest.catalogs:
                url = None
                is_searchable = (
                    catalog.is_search
                    or "search" in catalog.id.lower()
                    or (
                        catalog.extra and any(e.name == "search" for e in catalog.extra)
                    )
                )
                if is_searchable:
                    url = f"{base_url}/catalog/{catalog.type}/{catalog.id}/search={encoded_query}.json"

                    log_info(
                        "Queueing searchable catalog request",
                        data={"addon": manifest.name, "url": url},
                    )

                    task = asyncio.create_task(
                        self.addon_provider.get(url, response_model=CatalogResponse)
                    )
                    task_to_metadata[task] = {  # Store the Task object as the key
                        "manifest_id": manifest.id,
                        "addon_name": manifest.name,
                        "item_type": catalog.type,
                    }

        if not task_to_metadata:
            log_info(
                "No searchable catalogs found, returning early.",
                context="search_use_case",
            )
            return

        tasks_to_await = list(task_to_metadata.keys())

        # Initialize metadata and addon_name outside the loop's try-except
        # to ensure they are always defined for the outer exception handler.
        metadata: Dict[str, Any] = {}
        addon_name = "Unknown Addon"

        try:
            # Use asyncio.wait to manage tasks explicitly
            # We'll process them as they complete
            while tasks_to_await:
                done, pending = await asyncio.wait(
                    tasks_to_await, return_when=asyncio.FIRST_COMPLETED
                )

                for future_task in done:
                    # future_task is guaranteed to be one of the original Task objects
                    metadata = task_to_metadata[future_task]
                    addon_name = metadata.get("addon_name", "Unknown Addon")

                    # Log detailed info about the future_task object and its resolved metadata
                    log_info(
                        f"Processing future_task: type={type(future_task)}, id={id(future_task)}, repr={repr(future_task)}, addon={addon_name}",
                        context="search_use_case_future_debug",
                    )

                    try:
                        response: CatalogResponse | None = await future_task

                        if response and response.items:
                            manifest_id = metadata["manifest_id"]
                            item_type = metadata["item_type"]
                            for item in response.items:
                                item.id = f"{manifest_id}:{item.id}"
                            search_result = AddonSearchResult(
                                addonName=addon_name,
                                resultsByType={item_type: response.items},
                            )
                            log_info(
                                f"Yielding successful search result: {search_result.model_dump_json()}",
                                context="search_use_case",
                            )
                            yield search_result
                        else:
                            log_info(
                                f"No items found for addon: {addon_name}",
                                context="search_use_case",
                                data={"addon_metadata": metadata},
                            )
                            yield AddonSearchResult(
                                addonName=addon_name, resultsByType={}
                            )

                    except Exception as e:
                        log_error(
                            f"Error during await or processing for addon: {addon_name}",
                            data={"error": repr(e), "addon_metadata": metadata},
                            exc_info=True,
                        )
                        error_result = AddonSearchResult(
                            addonName=addon_name,
                            error=ErrorResponse(
                                message=f"Addon request failed: {repr(e)}"
                            ),
                        )
                        log_info(
                            f"Yielding error search result from inner catch: {error_result.model_dump_json()}",
                            context="search_use_case",
                        )
                        yield error_result

                # Update tasks_to_await to include only pending tasks for the next iteration
                tasks_to_await = list(pending)

        except Exception as e:
            log_error(
                f"An unexpected error occurred during processing for addon: {addon_name}",
                data={"error": repr(e), "addon_metadata": metadata},
                exc_info=True,
            )
            error_result = AddonSearchResult(
                addonName=addon_name,
                error=ErrorResponse(message=f"Unexpected error: {repr(e)}"),
            )
            log_info(
                f"Yielding unexpected error search result: {error_result.model_dump_json()}",
                context="search_use_case",
            )
            yield error_result
