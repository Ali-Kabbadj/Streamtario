import asyncio
from typing import Optional
from urllib.parse import quote
from .get_manifest import GetManifestUseCase
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.meta.meta import MetaResponse
from core.utils.logging import log_info, log_warn, log_error


class GetMetaUseCase:
    """
    A simple use case that fetches metadata for a specific item ID from a
    single, known manifest URL. It does not perform any ID manipulation.
    Returns the MetaResponse on success, or None on failure.
    """

    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

    async def execute(
        self, manifest_url: str, item_id: str, item_type: Optional[str]
    ) -> Optional[MetaResponse]:
        try:
            manifest = await self.get_manifest_use_case.execute(manifest_url)
            base_url = manifest_url.rsplit("/", 1)[0]
            encoded_item_id = quote(item_id)

            if item_type:
                url = f"{base_url}/meta/{item_type}/{encoded_item_id}.json"
                result = await self.addon_provider.get(url, response_model=MetaResponse)
                if result:
                    return result
                log_warn(f"Direct meta fetch failed for {url}")

            meta_resource = next(
                (res for res in manifest.resources if res.name == "meta"), None
            )
            if not meta_resource:
                return None

            types_to_check = meta_resource.types or manifest.types
            if not types_to_check:
                return None

            async def _try_fetch(t: str) -> Optional[MetaResponse]:
                url = f"{base_url}/meta/{t}/{encoded_item_id}.json"
                return await self.addon_provider.get(url, response_model=MetaResponse)

            tasks = [_try_fetch(t) for t in types_to_check]
            for future in asyncio.as_completed(tasks):
                successful_response = await future
                if successful_response:
                    return successful_response

            return None

        except Exception as e:
            log_error(
                f"Unexpected error in GetMetaUseCase for {manifest_url}",
                data={"error": str(e)},
            )
            return None
