from dependency_injector import containers, providers
from fastapi_factory.config import BaseAppSettings
from http_client_factory.public_client import PublicApiClient
from http_client_factory.client import ApiClient
from redis_factory.client import create_redis_client
from app.adapters.caching_external_addon_provider import CachingExternalAddonProvider
from app.adapters.redis_manifest_cache import RedisManifestCache
from app.domain.cache.i_manifest_cache import IManifestCache
from app.domain.cache.i_profile_manifest_cache import IProfileManifestCache
from app.adapters.redis_profile_manifest_cache import RedisProfileManifestCache
from app.domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)
from app.adapters.profile_addon_manifest_provider import ProfileAddonManifestProvider
from app.use_cases.event_handlers.handle_addon_installed import (
    HandleAddonInstalledEventUseCase,
)
from app.use_cases.event_handlers.handle_addon_uninstalled import (
    HandleAddonUninstalledEventUseCase,
)
from app.subscribers.redis_event_subscriber import RedisEventSubscriber
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from app.adapters.external_addon_provider import ExternalAddonProvider
from app.use_cases.get_manifest import GetManifestUseCase
from app.use_cases.get_meta import GetMetaUseCase
from app.use_cases.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.aggregate_catalog import AggregateCatalogUseCase
from app.use_cases.find_and_get_meta import FindAndGetMetaUseCase
from app.use_cases.get_meta_for_id import GetMetaForIdUseCase
from app.use_cases.search_use_case import SearchUseCase
from app.use_cases.get_home_catalogs import GetHomeCatalogsUseCase
from app.use_cases.get_streams import GetStreamsUseCase


class Container(containers.DeclarativeContainer):
    settings: providers.Dependency[BaseAppSettings] = providers.Dependency(
        instance_of=BaseAppSettings
    )

    redis_client = providers.Singleton(create_redis_client, settings=settings)

    api_client: providers.Factory[ApiClient] = providers.Factory(
        ApiClient, verify_ssl=False
    )
    public_api_client: providers.Factory[PublicApiClient] = providers.Factory(
        PublicApiClient, verify=False
    )

    profile_manifest_cache: providers.Factory[IProfileManifestCache] = (
        providers.Factory(RedisProfileManifestCache, redis_client=redis_client)
    )
    manifest_cache: providers.Factory[IManifestCache] = providers.Factory(
        RedisManifestCache, redis_client=redis_client
    )

    profile_addon_manifest_provider: providers.Factory[
        IProfileAddonManifestProvider
    ] = providers.Factory(
        ProfileAddonManifestProvider,
        api_client=api_client,
        profile_manifest_cache=profile_manifest_cache,
        account_profile_service_url=settings.provided.ACCOUNT_PROFILE_SERVICE_URL,
    )

    base_addon_provider: providers.Singleton[IExternalAddonProvider] = (
        providers.Singleton(ExternalAddonProvider, public_api_client=public_api_client)
    )

    addon_provider: providers.Factory[IExternalAddonProvider] = providers.Factory(
        CachingExternalAddonProvider,
        decorated_provider=base_addon_provider,
        redis_client=redis_client,
    )

    handle_addon_installed_use_case: providers.Factory[
        HandleAddonInstalledEventUseCase
    ] = providers.Factory(
        HandleAddonInstalledEventUseCase, cache=profile_manifest_cache
    )
    handle_addon_uninstalled_use_case: providers.Factory[
        HandleAddonUninstalledEventUseCase
    ] = providers.Factory(
        HandleAddonUninstalledEventUseCase, cache=profile_manifest_cache
    )

    redis_event_subscriber: providers.Singleton[RedisEventSubscriber] = (
        providers.Singleton(
            RedisEventSubscriber,
            redis_client=redis_client,
            handle_addon_installed_use_case=handle_addon_installed_use_case,
            handle_addon_uninstalled_use_case=handle_addon_uninstalled_use_case,
        )
    )

    get_manifest_use_case: providers.Factory[GetManifestUseCase] = providers.Factory(
        GetManifestUseCase,
        addon_provider=addon_provider,
        manifest_cache=manifest_cache,
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
            profile_addon_manifest_provider=profile_addon_manifest_provider,
        )
    )
    aggregate_catalog_use_case: providers.Factory[AggregateCatalogUseCase] = (
        providers.Factory(
            AggregateCatalogUseCase,
            get_manifest_use_case=get_manifest_use_case,
            addon_provider=addon_provider,
            profile_addon_manifest_provider=profile_addon_manifest_provider,
        )
    )
    find_and_get_meta_use_case: providers.Factory[FindAndGetMetaUseCase] = (
        providers.Factory(
            FindAndGetMetaUseCase,
            get_manifest_use_case=get_manifest_use_case,
            get_meta_use_case=get_meta_use_case,
            profile_addon_manifest_provider=profile_addon_manifest_provider,
        )
    )
    search_use_case: providers.Factory[SearchUseCase] = providers.Factory(
        SearchUseCase,
        get_manifest_use_case=get_manifest_use_case,
        addon_provider=addon_provider,
        profile_manifest_cache=profile_manifest_cache,
    )
    get_home_catalogs_use_case: providers.Factory[GetHomeCatalogsUseCase] = (
        providers.Factory(
            GetHomeCatalogsUseCase,
            get_manifest_use_case=get_manifest_use_case,
            addon_provider=addon_provider,
            profile_addon_manifest_provider=profile_addon_manifest_provider,
        )
    )
    get_streams_use_case: providers.Factory[GetStreamsUseCase] = providers.Factory(
        GetStreamsUseCase,
        get_manifest_use_case=get_manifest_use_case,
        addon_provider=addon_provider,
        profile_addon_manifest_provider=profile_addon_manifest_provider,
        find_and_get_meta_use_case=find_and_get_meta_use_case,
    )
