from http_client_factory.client import ApiClient
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.pydantic.addons.manifest import AddonManifest
from app.domain.providers.i_addon_provider import IAddonProvider
from urllib.parse import urlencode


class AddonProvider(IAddonProvider):
    def __init__(self, api_client: ApiClient, ADDON_CONTROLLER_SERVICE_URL: str):
        self.api_client = api_client
        self.ADDON_CONTROLLER_SERVICE_URL = ADDON_CONTROLLER_SERVICE_URL

    async def get_manifest(self, manifest_url: str) -> AddonManifest:
        """
        Calls the addon-controller's REST endpoint to validate a manifest.
        This is the sole responsibility of this provider in this service.
        """
        params = urlencode({"url": manifest_url})
        full_url = f"{self.ADDON_CONTROLLER_SERVICE_URL}/api/v1/manifest?{params}"

        response = await self.api_client.get(url=full_url, response_model=AddonManifest)

        if not response.ok or not response.data:
            raise ApiException(
                error_code=ApiErrorCode.VALIDATION_MANIFEST_URL_INVALID,
                details=(
                    response.error.details
                    if response.error
                    else "No details from ApiClient"
                ),
            )
        return response.data
