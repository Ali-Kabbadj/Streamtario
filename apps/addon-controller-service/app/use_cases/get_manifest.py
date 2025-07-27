from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.addons.manifest import AddonManifest
from validation_factory.validators import run_validators
from ..validators.manifest_url_validator import ManifestUrlValidator
from domain_exceptions.exceptions import ValidationException
from core.utils.logging import log_http, log_error, log_info


class GetManifestUseCase:
    def __init__(self, addon_provider: IExternalAddonProvider):
        self.addon_provider = addon_provider

    async def execute(self, url: str) -> AddonManifest:
        log_info(f"Running validation for manifest URL: {url}")
        await run_validators(url, [ManifestUrlValidator()])

        log_http(f"Fetching manifest from: {url}")
        result = await self.addon_provider.get(url, response_model=AddonManifest)

        if not result:
            log_error(f"Failed to get manifest from {url}")
            raise ValidationException(
                message=f"The manifest at {url} is invalid or could not be reached."
            )
        result.manifest_url = url
        log_http(f"Successfully validated manifest for: {result.name}")
        return result
