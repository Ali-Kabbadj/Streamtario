import asyncio
from typing import Optional, List
from urllib.parse import quote
from .get_manifest import GetManifestUseCase
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.meta.meta import MetaResponse
from core.pydantic.addons.manifest import AddonManifest, Resource
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
        self,
        manifest_url: str,
        item_id: str,
        item_type: Optional[str],
        timeout: Optional[float] = None,
    ) -> Optional[MetaResponse]:
        try:
            manifest = await self.get_manifest_use_case.execute(manifest_url)
            base_url = manifest_url.rsplit("/", 1)[0]
            encoded_item_id = quote(item_id)

            if item_type:
                url = f"{base_url}/meta/{item_type}/{encoded_item_id}.json"
                result = await self.addon_provider.get(
                    url, response_model=MetaResponse, timeout=timeout
                )
                if result and result.meta:
                    return result
                # This log is now correct
                log_warn(f"Direct meta fetch failed for {url}")

            meta_resource = next(
                (res for res in manifest.resources if res.name == "meta"), None
            )
            if not meta_resource:
                return None

            types_to_check = []
            if isinstance(meta_resource, Resource) and meta_resource.types:
                types_to_check = meta_resource.types
            elif manifest.types:
                types_to_check = manifest.types

            if not types_to_check:
                return None

            async def _try_fetch(t: str) -> Optional[MetaResponse]:
                url = f"{base_url}/meta/{t}/{encoded_item_id}.json"
                response = await self.addon_provider.get(
                    url, response_model=MetaResponse, timeout=timeout
                )
                if response and response.meta:
                    return response
                return None

            tasks = [_try_fetch(t) for t in types_to_check if t != item_type]
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
