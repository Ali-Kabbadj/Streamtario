from http_client_factory.client import ApiClient
from domain_exceptions.exceptions import NotFoundException, ValidationException
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.catalog.catalog import CatalogResponse, CatalogRequest
from core.pydantic.meta.meta import MetaResponse
from app.domain.providers.i_addon_provider import IAddonProvider
from urllib.parse import urlencode, quote


class AddonProvider(IAddonProvider):
    def __init__(self, api_client: ApiClient, addon_controller_url: str):
        self.api_client = api_client
        self.addon_controller_url = addon_controller_url

    async def get_manifest(self, manifest_url: str) -> AddonManifest:
        params = urlencode({"url": manifest_url})
        full_url = f"{self.addon_controller_url}/api/v1/manifest?{params}"

        response = await self.api_client.get(url=full_url, response_model=AddonManifest)

        if not response.ok or not response.data:
            # --- FIX: Use keyword arguments ---
            raise ValidationException(
                message="The manifest URL is invalid or could not be reached.",
                details=(
                    response.error.details
                    if response.error
                    else "No details from ApiClient"
                ),
            )
        return response.data

    async def get_catalog(
        self, manifest_url: str, catalog_type: str, catalog_id: str, extra_props: dict
    ) -> CatalogResponse:
        catalog_request = CatalogRequest(
            manifestUrl=manifest_url,
            catalogType=catalog_type,
            catalogId=catalog_id,
            extraProps=extra_props,
        )
        response = await self.api_client.post(
            url=f"{self.addon_controller_url}/api/v1/catalog",
            json_payload=catalog_request.model_dump(by_alias=True),
            response_model=CatalogResponse,
        )

        if not response.ok or not response.data:
            if response.error and "NotFound" in response.error.type:
                raise NotFoundException(
                    entity_name="Catalog in external addon",
                    identifier=f"{catalog_type}/{catalog_id}",
                )
            # --- FIX: Use keyword arguments ---
            raise ValidationException(
                message=(
                    response.error.dev_message
                    if response.error
                    else "Failed to fetch catalog"
                ),
                details=response.error.details if response.error else None,
            )
        return response.data

    async def get_meta(
        self, manifest_url: str, item_type: str, item_id: str
    ) -> MetaResponse:
        encoded_item_id = quote(item_id)
        request_body = {"manifestUrl": manifest_url, "itemType": item_type}

        response = await self.api_client.post(
            url=f"{self.addon_controller_url}/api/v1/meta/{encoded_item_id}",
            json_payload=request_body,
            response_model=MetaResponse,
        )

        if not response.ok or not response.data:
            # --- FIX: Use keyword arguments ---
            raise ValidationException(
                message=(
                    response.error.dev_message
                    if response.error
                    else "Failed to fetch metadata"
                ),
                details=response.error.details if response.error else None,
            )
        return response.data
