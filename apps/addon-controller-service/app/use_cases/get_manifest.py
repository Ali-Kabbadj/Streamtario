from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.addons.manifest import AddonManifest
from validation_factory.validators import run_validators
from ..validators.manifest import ManifestUrlValidator
from https_factory.models import ErrorResponse
from fastapi_factory.exceptions import NotFoundException, ValidationException
from core.utils.logging import log_http, log_error, log_info


class GetManifestUseCase:
    def __init__(self, addon_provider: IExternalAddonProvider):
        self.addon_provider = addon_provider

    async def execute(self, url: str) -> AddonManifest:
        log_info(f"Running validation for manifest URL: {url}")
        await run_validators(url, [ManifestUrlValidator()])

        log_http(f"Fetching manifest from: {url}")
        result = await self.addon_provider.get(url, response_model=AddonManifest)

        if isinstance(result, ErrorResponse):
            log_error(
                f"Failed to get manifest: {result.error_message}", data=result.details
            )
            if result.status_code == 404:
                raise NotFoundException(entity_name="Manifest URL", identifier=url)
            else:
                raise ValidationException(
                    message="The manifest content is invalid or the request failed.",
                    details=result.details,
                )
        log_http(f"Successfully validated manifest for: {result.data.name}")
        return result.data
