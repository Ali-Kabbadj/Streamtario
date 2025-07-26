from dependency_injector import containers, providers
from http_client_factory.public_client import PublicApiClient
from http_client_factory.client import ApiClient # Import ApiClient
from app.settings import settings # Import settings

from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from app.adapters.external_addon_provider import ExternalAddonProvider
from app.use_cases.get_manifest import GetManifestUseCase
from app.use_cases.get_meta import GetMetaUseCase
from app.use_cases.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.aggregate_catalog import AggregateCatalogUseCase
from app.use_cases.find_and_get_meta import FindAndGetMetaUseCase
from app.use_cases.search_use_case import SearchUseCase


class Container(containers.DeclarativeContainer):
    api_client: providers.Factory[ApiClient] = providers.Factory( # Change to ApiClient
        ApiClient, verify_ssl=False # Instantiate with verify=False
    )
    public_api_client: providers.Factory[PublicApiClient] = providers.Factory(
        PublicApiClient, verify=False # Instantiate with verify=False
    )

    # Adapters
    addon_provider: providers.Factory[IExternalAddonProvider] = providers.Factory(
        ExternalAddonProvider, public_api_client=public_api_client
    )

    # Use Cases (Single-purpose tools)
    get_manifest_use_case: providers.Factory[GetManifestUseCase] = providers.Factory(
        GetManifestUseCase, addon_provider=addon_provider
    )
    get_meta_use_case: providers.Factory[GetMetaUseCase] = providers.Factory(
        GetMetaUseCase,
        get_manifest_use_case=get_manifest_use_case,
        addon_provider=addon_provider,
    )
    discover_catalogs_use_case: providers.Factory[DiscoverCatalogsUseCase] = (
        providers.Factory(
            DiscoverCatalogsUseCase,
            get_manifest_use_case=get_manifest_use_case,
        )
    )
    aggregate_catalog_use_case: providers.Factory[AggregateCatalogUseCase] = (
        providers.Factory(
            AggregateCatalogUseCase,
            get_manifest_use_case=get_manifest_use_case,
            addon_provider=addon_provider,
        )
    )
    find_and_get_meta_use_case: providers.Factory[FindAndGetMetaUseCase] = (
        providers.Factory(
            FindAndGetMetaUseCase,
            get_manifest_use_case=get_manifest_use_case,
            get_meta_use_case=get_meta_use_case,
        )
    )
    search_use_case: providers.Factory[SearchUseCase] = providers.Factory(
        SearchUseCase,
        get_manifest_use_case=get_manifest_use_case,
        addon_provider=addon_provider,
        api_client=api_client,  # Change to api_client
        account_service_url=settings.ACCOUNT_PROFILE_SERVICE,  # Add account_service_url
    )
