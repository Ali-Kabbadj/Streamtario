from http_client_factory.client import ApiClient
from domain_exceptions.exceptions import ValidationException
from core.pydantic.addons.manifest import AddonManifest
from app.domain.providers.i_addon_provider import IAddonProvider
from urllib.parse import urlencode


class AddonProvider(IAddonProvider):
    def __init__(self, api_client: ApiClient, addon_controller_url: str):
        self.api_client = api_client
        self.addon_controller_url = addon_controller_url

    async def get_manifest(self, manifest_url: str) -> AddonManifest:
        """
        Calls the addon-controller's REST endpoint to validate a manifest.
        This is the sole responsibility of this provider in this service.
        """
        params = urlencode({"url": manifest_url})
        full_url = f"{self.addon_controller_url}/api/v1/manifest?{params}"

        response = await self.api_client.get(url=full_url, response_model=AddonManifest)

        if not response.ok or not response.data:
            raise ValidationException(
                message="The manifest URL is invalid or could not be reached.",
                details=(
                    response.error.details
                    if response.error
                    else "No details from ApiClient"
                ),
            )
        return response.data
