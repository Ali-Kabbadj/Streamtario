from .get_manifest import GetManifestUseCase
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.catalog.catalog import CatalogResponse
from fastapi_factory.exceptions import NotFoundException, ValidationException
from https_factory.models import ErrorResponse
from core.utils.logging import log_http


class GetCatalogUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

    async def execute(
        self, manifest_url: str, catalog_type: str, catalog_id: str, extra_props: dict
    ) -> CatalogResponse:
        manifest = await self.get_manifest_use_case.execute(manifest_url)

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
        catalog_response = await self.addon_provider.get(
            url=external_catalog_url, response_model=CatalogResponse
        )

        if isinstance(catalog_response, ErrorResponse):
            raise ValidationException(
                "Failed to fetch or validate the external catalog.",
                catalog_response.details,
            )
        return catalog_response.data
