from https_factory.client import ApiClient
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_http, log_error
from fastapi_factory.exceptions import NotFoundException, ValidationException
from https_factory.models import SuccessResponse


class HttpAddonService:
    def __init__(self, api_client: ApiClient):
        self.api_client = api_client

    async def get_manifest(self, url: str) -> AddonManifest:
        log_http(f"Fetching manifest from: {url}")

        result = await self.api_client.get(url, response_model=AddonManifest)
        if isinstance(result, SuccessResponse):
            log_http(f"Successfully validated manifest for: {result.data.name}")
            return result.data
        else:
            log_error(
                f"Failed to get manifest: {result.error_message}", data=result.details
            )
            if result.status_code == 404:
                raise NotFoundException(details={"url": url})
            else:
                raise ValidationException(details=result.details)
