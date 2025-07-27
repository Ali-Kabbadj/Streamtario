import asyncio
from typing import List, Dict, Any, AsyncGenerator
from urllib.parse import quote
from typing import List
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    AddonSearchResult,
)
from core.pydantic.api.error import ErrorResponse
from http_client_factory.client import ApiClient
from api_contract.responses import ApiResponse

# --- FIX: Import the correct exception and error code enum ---
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info, log_error, log_warn
from .get_manifest import GetManifestUseCase
from core.pydantic.api.internals import ManifestUrlsResponse


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
            # --- FIX: Raise correct, coded exception ---
            raise ApiException(
                ApiErrorCode.SERVICE_UNAVAILABLE,
                details={
                    "reason": "ACCOUNT_PROFILE_SERVICE_URL URL is not configured."
                },
            )

        url = f"{self.account_service_url}/internal/v1/profiles/{profile_id}/manifest-urls"

        api_response: ApiResponse[ManifestUrlsResponse] = await self.api_client.get(
            url, response_model=ManifestUrlsResponse
        )

        if not api_response.ok or api_response.data is None:
            # --- FIX: Raise correct, coded exception ---
            raise ApiException(
                ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
            )

        return api_response.data.manifest_urls

    async def execute(
        self, profile_id: str, search_query: str
    ) -> AsyncGenerator[AddonSearchResult, None]:

        manifest_urls = []
        try:
            manifest_urls = await self._get_manifest_urls_for_profile(profile_id)
        except ApiException as e:
            # This handles both PROFILE_NOT_FOUND and SERVICE_UNAVAILABLE from the above helper
            log_warn(
                f"Search cannot proceed for profile {profile_id}: {e.code}",
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

        task_to_metadata: Dict[asyncio.Task, Dict[str, Any]] = {}
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
                    task_to_metadata[task] = {
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
        metadata: Dict[str, Any] = {}
        addon_name = "Unknown Addon"

        try:
            while tasks_to_await:
                done, pending = await asyncio.wait(
                    tasks_to_await, return_when=asyncio.FIRST_COMPLETED
                )

                for future_task in done:
                    metadata = task_to_metadata[future_task]
                    addon_name = metadata.get("addon_name", "Unknown Addon")

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
