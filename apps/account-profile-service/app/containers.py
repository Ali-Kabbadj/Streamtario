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
from app.adapters.addon_provider import AddonProvider

# Import ALL remaining Use Cases
from app.use_cases.account.create_account import CreateAccountUseCase
from app.use_cases.account.find_or_create_by_social import FindOrCreateBySocialUseCase
from app.use_cases.account.get_account import GetAccountUseCase
from app.use_cases.account.login import LoginUseCase  # <-- NEW IMPORT
from app.use_cases.profile.get_profile import GetProfileUseCase
from app.use_cases.profile.create_profile import CreateProfileUseCase
from app.use_cases.profile.install_addon import InstallAddonUseCase
from app.use_cases.profile.uninstall_addon import UninstallAddonUseCase
from app.use_cases.profile.install_addon_for_all_profiles import (
    InstallAddonForAllProfilesUseCase,
)
from app.use_cases.profile.uninstall_addon_from_all_profiles import (
    UninstallAddonFromAllProfilesUseCase,
)
from app.use_cases.profile.update_profile import UpdateProfileUseCase

from security.jwt_service import IJwtService, JwtService


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

    jwt_service: providers.Factory[IJwtService] = providers.Factory(
        JwtService,
        secret_key=settings.provided.JWT_SECRET_KEY,
        algorithm=settings.provided.JWT_ALGORITHM,
        # The expire minutes are not needed here as this service only decodes tokens
        access_token_expire_minutes=0,
        refresh_token_expire_days=0,
    )

    create_account_use_case: providers.Factory[CreateAccountUseCase] = (
        providers.Factory(
            CreateAccountUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
        )
    )

    find_or_create_by_social_use_case: providers.Factory[
        FindOrCreateBySocialUseCase
    ] = providers.Factory(FindOrCreateBySocialUseCase, uow_factory=uow.provider)

    get_account_use_case: providers.Factory[GetAccountUseCase] = providers.Factory(
        GetAccountUseCase, uow_factory=uow.provider
    )

    login_use_case: providers.Factory[LoginUseCase] = providers.Factory(
        LoginUseCase,
        uow_factory=uow.provider,
        password_hasher=password_hasher,
    )

    get_profile_use_case: providers.Factory[GetProfileUseCase] = providers.Factory(
        GetProfileUseCase, uow_factory=uow.provider
    )

    create_profile_use_case: providers.Factory[CreateProfileUseCase] = (
        providers.Factory(
            CreateProfileUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
        )
    )

    update_profile_use_case: providers.Factory[UpdateProfileUseCase] = (
        providers.Factory(
            UpdateProfileUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
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
