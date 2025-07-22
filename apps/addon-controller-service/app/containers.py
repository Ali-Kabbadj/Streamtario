from dependency_injector import containers, providers
from https_factory.client import ApiClient

# Import Interfaces
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider

# Import Concrete Implementations
from app.adapters.external_addon_provider import ExternalAddonProvider

# Import Use Cases
from app.use_cases.get_manifest import GetManifestUseCase
from app.use_cases.get_catalog import GetCatalogUseCase
from app.use_cases.get_meta import GetMetaUseCase


class Container(containers.DeclarativeContainer):
    """DI container for the Addon Controller service."""

    # Infrastructure
    # This public_api_client doesn't need certs as it calls public URLs
    public_api_client: providers.Factory[ApiClient] = providers.Factory(ApiClient)

    # Adapters
    addon_provider: providers.Factory[IExternalAddonProvider] = providers.Factory(
        ExternalAddonProvider, api_client=public_api_client
    )

    # Use Cases
    get_manifest_use_case: providers.Factory[GetManifestUseCase] = providers.Factory(
        GetManifestUseCase, addon_provider=addon_provider
    )
    get_catalog_use_case: providers.Factory[GetCatalogUseCase] = providers.Factory(
        GetCatalogUseCase,
        get_manifest_use_case=get_manifest_use_case,
        addon_provider=addon_provider,
    )
    get_meta_use_case: providers.Factory[GetMetaUseCase] = providers.Factory(
        GetMetaUseCase,
        get_manifest_use_case=get_manifest_use_case,
        addon_provider=addon_provider,
    )
