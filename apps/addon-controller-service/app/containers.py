from dependency_injector import containers, providers
from http_client_factory.public_client import PublicApiClient

from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from app.adapters.external_addon_provider import ExternalAddonProvider
from app.use_cases.get_manifest import GetManifestUseCase
from app.use_cases.get_catalog import GetCatalogUseCase
from app.use_cases.get_meta import GetMetaUseCase
from app.use_cases.aggregate_all_addons import AggregateAllAddonsUseCase


class Container(containers.DeclarativeContainer):
    public_api_client: providers.Factory[PublicApiClient] = providers.Factory(
        PublicApiClient
    )

    # Adapters
    addon_provider: providers.Factory[IExternalAddonProvider] = providers.Factory(
        ExternalAddonProvider, public_api_client=public_api_client
    )

    # Use Cases (Single-purpose tools)
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
    aggregate_all_addons_use_case: providers.Factory[AggregateAllAddonsUseCase] = (
        providers.Factory(
            AggregateAllAddonsUseCase,
            get_manifest_use_case=get_manifest_use_case,
            get_meta_use_case=get_meta_use_case,
            addon_provider=addon_provider,
        )
    )
