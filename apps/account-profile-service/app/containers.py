from dependency_injector import containers, providers
from fastapi_factory.config import BaseAppSettings
from database_factory.db import create_db_engine, create_db_session_factory
from security_factory.password import BcryptPasswordHasher
from http_client_factory.client import ApiClient

# Import Interfaces
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.providers.i_addon_provider import IAddonProvider
from security_factory.services.passwordservice import IPasswordHasher

# Import Concrete Implementations
from app.infrastructure.sqlalchemy_uow.session_manager import SqlAlchemyUnitOfWork

# Import All Use Cases
from app.use_cases.account.create_account import CreateAccountUseCase
from app.use_cases.account.get_account import GetAccountUseCase
from app.use_cases.profile.install_addon import InstallAddonUseCase
from app.use_cases.profile.uninstall_addon import UninstallAddonUseCase
from app.use_cases.profile.install_addon_for_all_profiles import (
    InstallAddonForAllProfilesUseCase,
)
from app.use_cases.profile.uninstall_addon_from_all_profiles import (
    UninstallAddonFromAllProfilesUseCase,
)
from app.use_cases.profile.get_addon_catalog import GetAddonCatalogUseCase
from app.use_cases.profile.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.profile.get_item_meta import GetItemMetaUseCase
from app.use_cases.profile.search_catalog import SearchCatalogUseCase
from app.use_cases.profile.stream_search_catalog import StreamSearchCatalogCase
from app.adapters.addon_provider import AddonProvider


class Container(containers.DeclarativeContainer):
    settings: providers.Dependency[BaseAppSettings] = providers.Dependency(
        instance_of=BaseAppSettings
    )

    db_engine = providers.Singleton(create_db_engine, settings=settings)
    db_session_factory = providers.Singleton(
        create_db_session_factory, engine=db_engine
    )
    password_hasher: providers.Factory[IPasswordHasher] = providers.Factory(
        BcryptPasswordHasher
    )
    api_client: providers.Factory[ApiClient] = providers.Factory(
        ApiClient, verify_ssl=settings.provided.SSL_CERTFILE
    )

    addon_provider: providers.Factory[IAddonProvider] = providers.Factory(
        AddonProvider,
        api_client=api_client,
        addon_controller_url=settings.provided.ADDON_CONTROLLER_URL,
    )

    uow: providers.Factory[IUnitOfWork] = providers.Factory(
        SqlAlchemyUnitOfWork, session_factory=db_session_factory
    )

    create_account_use_case: providers.Factory[CreateAccountUseCase] = (
        providers.Factory(
            CreateAccountUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
        )
    )
    get_account_use_case: providers.Factory[GetAccountUseCase] = providers.Factory(
        GetAccountUseCase, uow_factory=uow.provider
    )
    get_addon_catalog_use_case: providers.Factory[GetAddonCatalogUseCase] = (
        providers.Factory(
            GetAddonCatalogUseCase,
            uow_factory=uow.provider,
            addon_provider=addon_provider,
        )
    )
    discover_catalogs_use_case: providers.Factory[DiscoverCatalogsUseCase] = (
        providers.Factory(
            DiscoverCatalogsUseCase,
            uow_factory=uow.provider,
            addon_provider=addon_provider,
        )
    )
    install_addon_use_case: providers.Factory[InstallAddonUseCase] = providers.Factory(
        InstallAddonUseCase, uow_factory=uow.provider, addon_provider=addon_provider
    )
    uninstall_addon_use_case: providers.Factory[UninstallAddonUseCase] = (
        providers.Factory(UninstallAddonUseCase, uow_factory=uow.provider)
    )
    install_addon_for_all_profiles_use_case: providers.Factory[
        InstallAddonForAllProfilesUseCase
    ] = providers.Factory(
        InstallAddonForAllProfilesUseCase,
        uow_factory=uow.provider,
        install_addon_use_case=install_addon_use_case,
    )
    uninstall_addon_from_all_profiles_use_case: providers.Factory[
        UninstallAddonFromAllProfilesUseCase
    ] = providers.Factory(
        UninstallAddonFromAllProfilesUseCase, uow_factory=uow.provider
    )
    get_item_meta_use_case: providers.Factory[GetItemMetaUseCase] = providers.Factory(
        GetItemMetaUseCase, uow_factory=uow.provider, addon_provider=addon_provider
    )
    search_all_addons_use_case: providers.Factory[SearchCatalogUseCase] = (
        providers.Factory(
            SearchCatalogUseCase,
            discover_catalogs_use_case=discover_catalogs_use_case,
            get_addon_catalog_use_case=get_addon_catalog_use_case,
        )
    )
    stream_search_all_addons_use_case: providers.Factory[StreamSearchCatalogCase] = (
        providers.Factory(
            StreamSearchCatalogCase,
            discover_catalogs_use_case=discover_catalogs_use_case,
            get_addon_catalog_use_case=get_addon_catalog_use_case,
        )
    )
