import asyncio
from typing import Optional
from urllib.parse import quote
from .get_manifest import GetManifestUseCase
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.meta.meta import MetaResponse
from domain_exceptions.exceptions import NotFoundException
from api_contract.responses import ApiResponse
from core.utils.logging import log_info, log_warn, log_error


class GetMetaUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

    async def execute(
        self, manifest_url: str, item_id: str, item_type: Optional[str]
    ) -> MetaResponse:
        log_info(
            f"META USE CASE for manifest: '{manifest_url}', item_id: '{item_id}', type: '{item_type}'"
        )
        manifest = await self.get_manifest_use_case.execute(manifest_url)
        base_url = manifest_url.rsplit("/", 1)[0]
        encoded_item_id = quote(item_id)

        if item_type:
            log_info(f"Item type '{item_type}' provided. Attempting direct fetch.")
            url = f"{base_url}/meta/{item_type}/{encoded_item_id}.json"
            result = await self.addon_provider.get(url, response_model=MetaResponse)
            if result:
                return result
            else:
                raise NotFoundException(
                    "Metadata in external addon with specified type",
                    f"{item_type}/{item_id}",
                )

        log_warn(
            f"No item type provided for '{item_id}'. Falling back to manifest iteration."
        )
        meta_resource = next(
            (res for res in manifest.resources if res.name == "meta"), None
        )
        if not meta_resource:
            raise NotFoundException(
                "Addon does not have a 'meta' resource", manifest.id
            )

        types_to_check = meta_resource.types or manifest.types
        if not types_to_check:
            raise NotFoundException(
                "No 'types' found for meta resource or at top-level.", manifest.id
            )

        async def _try_fetch(t: str) -> MetaResponse | None:
            url = f"{base_url}/meta/{t}/{encoded_item_id}.json"
            return await self.addon_provider.get(url, response_model=MetaResponse)

        tasks = [_try_fetch(t) for t in types_to_check]
        results = await asyncio.gather(*tasks)
        successful_response = next((res for res in results if res is not None), None)
        if successful_response:
            return successful_response
        else:
            log_error(
                f"FAILURE: Could not fetch metadata for '{item_id}' from any attempted URL."
            )
            raise NotFoundException("Metadata for item ID in external addon", item_id)
