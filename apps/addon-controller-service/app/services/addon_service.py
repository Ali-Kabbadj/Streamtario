from https_factory.client import ApiClient
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_http, log_error, log_info
from fastapi_factory.exceptions import NotFoundException, ValidationException
from https_factory.models import ErrorResponse
from validation_factory.validators import run_validators
from core.pydantic.catalog.catalog import CatalogResponse
from core.pydantic.meta.meta import MetaResponse
from .services import IAddonService
from ..validators.manifest import ManifestUrlValidator
from https_factory.models import SuccessResponse
import asyncio


class HttpsAddonService(IAddonService):
    """
    Concrete implementation of the IAddonService that fetches manifest data
    over HTTP.
    """

    def __init__(self, api_client: ApiClient):
        self.api_client = api_client

    async def get_manifest(self, url: str) -> AddonManifest:
        """
        Fetches an addon manifest from a URL, validates the URL format,
        and then validates the content of the manifest itself.
        """
        log_info(f"Running validation for manifest URL: {url}")
        await run_validators(url, [ManifestUrlValidator()])

        log_http(f"Fetching manifest from: {url}")
        result = await self.api_client.get(url, response_model=AddonManifest)

        if isinstance(result, ErrorResponse):
            log_error(
                f"Failed to get manifest: {result.error_message}", data=result.details
            )
            if result.status_code == 404:
                # Use our smart NotFoundException
                raise NotFoundException(entity_name="Manifest URL", identifier=url)
            else:
                raise ValidationException(
                    message="The manifest content is invalid or the request failed.",
                    details=result.details,
                )
        log_http(f"Successfully validated manifest for: {result.data.name}")
        return result.data

    async def get_catalog(
        self, manifest_url: str, catalog_type: str, catalog_id: str, extra_props: dict
    ) -> CatalogResponse:
        """Fetches catalog data from an external addon."""
        manifest = await self.get_manifest(manifest_url)

        if not any(
            c.id == catalog_id and c.type == catalog_type for c in manifest.catalogs
        ):
            raise NotFoundException(
                "Catalog", f"type='{catalog_type}', id='{catalog_id}'"
            )

        base_url = manifest_url.rsplit("/", 1)[0]
        prop_string = "/".join([f"{k}={v}" for k, v in extra_props.items()])
        catalog_path = f"catalog/{catalog_type}/{catalog_id}"
        if prop_string:
            catalog_path += f"/{prop_string}"

        external_catalog_url = f"{base_url}/{catalog_path}.json"

        log_http(f"Fetching external catalog from: {external_catalog_url}")
        public_api_client = ApiClient()
        catalog_response = await public_api_client.get(
            url=external_catalog_url, response_model=CatalogResponse
        )
        await public_api_client.close()

        if isinstance(catalog_response, ErrorResponse):
            raise ValidationException(
                "Failed to fetch or validate the external catalog.",
                catalog_response.details,
            )

        return catalog_response.data

    async def get_meta(self, manifest_url: str, item_id: str) -> MetaResponse:
        log_info(
            f"--- META REQUEST RECEIVED for manifest: '{manifest_url}', item_id: '{item_id}' ---"
        )
        manifest = await self.get_manifest(manifest_url)
        base_url = manifest_url.rsplit("/", 1)[0]

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

        log_info(
            f"Found 'meta' resource. Will attempt to fetch from types: {types_to_check}"
        )

        public_api_client = ApiClient()

        async def _try_fetch(item_type: str):
            url = f"{base_url}/meta/{item_type}/{item_id}.json"
            log_info(f"  - [ATTEMPT] Fetching from external URL: {url}")
            return await public_api_client.get(url, response_model=MetaResponse)

        tasks = [_try_fetch(item_type) for item_type in types_to_check]
        all_results = await asyncio.gather(*tasks)
        await public_api_client.close()

        successful_response = next(
            (res for res in all_results if isinstance(res, SuccessResponse)), None
        )

        if successful_response:
            log_info(f"SUCCESS: Found metadata for '{item_id}'")
            return successful_response.data
        else:
            log_error(
                f"FAILURE: Could not fetch metadata for '{item_id}' from any attempted URL.",
                data={"all_results": all_results},
            )
            raise NotFoundException("Metadata for item ID in external addon", item_id)
