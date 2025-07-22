from https_factory.client import ApiClient
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_http, log_error, log_info
from fastapi_factory.exceptions import NotFoundException
from https_factory.models import SuccessResponse
from validation_factory.validators import run_validators, ValidatorException

# Import our new validator
from ..validators.manifest import ManifestUrlValidator


class HttpAddonService:
    def __init__(self, api_client: ApiClient):
        self.api_client = api_client

    async def get_manifest(self, url: str) -> AddonManifest:
        try:
            log_info(f"Running validation for manifest URL: {url}")
            await run_validators(url, [ManifestUrlValidator()])
        except ValidatorException as e:
            log_error(f"Manifest URL validation failed: {e.message}", data=e.details)
            raise e

        log_http(f"Fetching manifest from: {url}")
        result = await self.api_client.get(url, response_model=AddonManifest)

        if not result.is_success:
            log_error(
                f"Failed to get manifest: {result.error_message}", data=result.details
            )
            if result.status_code == 404:
                raise NotFoundException(details={"url": url})
            else:
                raise ValidatorException(
                    "The manifest content is invalid.", details=result.details
                )

        if not isinstance(result.data, AddonManifest):
            raise ValidatorException(
                "Received success status but data is not a valid manifest."
            )

        log_http(f"Successfully validated manifest for: {result.data.name}")
        return result.data
