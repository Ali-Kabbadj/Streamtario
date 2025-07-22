from https_factory.client import ApiClient
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_http, log_error, log_info
from fastapi_factory.exceptions import NotFoundException, ValidationException
from https_factory.models import ErrorResponse
from validation_factory.validators import run_validators, ValidatorException

from .services import IAddonService
from ..validators.manifest import ManifestUrlValidator


class HttpAddonService(IAddonService):
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
        # This now raises our new, smart ValidatorException directly
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
                # Pass the rich details from the API client directly
                raise ValidationException(
                    message="The manifest content is invalid or the request failed.",
                    details=result.details,
                )
        log_http(f"Successfully validated manifest for: {result.data.name}")
        return result.data
