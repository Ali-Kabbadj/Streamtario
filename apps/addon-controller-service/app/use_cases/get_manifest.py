from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.addons.manifest import AddonManifest
from validation_factory.validators import run_validators
from ..validators.manifest_url_validator import ManifestUrlValidator
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_http, log_error, log_cache
from app.domain.cache.i_manifest_cache import IManifestCache


class GetManifestUseCase:
    def __init__(
        self,
        addon_provider: IExternalAddonProvider,
        manifest_cache: IManifestCache,
    ):
        self.addon_provider = addon_provider
        self.manifest_cache = manifest_cache  # <-- ADD

    async def execute(self, url: str) -> AddonManifest:
        cached_manifest = await self.manifest_cache.get(url)
        if cached_manifest:
            log_cache(f"Manifest cache HIT for: {url}")
            cached_manifest.manifest_url = url
            return cached_manifest

        log_cache(f"Manifest cache MISS for: {url}")

        await run_validators(url, [ManifestUrlValidator()])

        log_http(f"Fetching manifest from: {url}")
        result = await self.addon_provider.get(url, response_model=AddonManifest)

        if not result:
            log_error(f"Failed to get manifest from {url}")
            raise ApiException(ApiErrorCode.VALIDATION_MANIFEST_URL_INVALID)

        result.manifest_url = url

        await self.manifest_cache.set(url, result)
        log_cache(f"Successfully cached manifest for: {result.name}")

        log_http(f"Successfully validated manifest for: {result.name}")
        return result
