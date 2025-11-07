from dependency_injector import containers, providers
from fastapi_factory.config import BaseAppSettings
from database_factory.db import create_db_engine, create_db_session_factory
from redis_factory.client import create_redis_client
from security_factory.password import BcryptPasswordHasher
from http_client_factory.client import ApiClient
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.providers.i_addon_provider import IAddonProvider
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from app.policies.account_authorization_policy import AccountAuthorizationPolicy
from app.domain.events.i_event_publisher import IEventPublisher
from app.adapters.redis_event_publisher import RedisEventPublisher
from security_factory.services.passwordservice import IPasswordHasher
from app.infrastructure.sqlalchemy_uow.session_manager import SqlAlchemyUnitOfWork
from app.adapters.addon_provider import AddonProvider
from app.use_cases.account.create_account import CreateAccountUseCase
from app.use_cases.account.find_or_create_by_social import FindOrCreateBySocialUseCase
from app.use_cases.account.get_account import GetAccountUseCase
from app.use_cases.account.login import LoginUseCase
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
from app.use_cases.profile.update_advanced_settings import UpdateAdvancedSettingsUseCase
from app.use_cases.profile.update_profile import UpdateProfileUseCase
from app.use_cases.profile.update_profile_settings import UpdateProfileSettingsUseCase
from app.use_cases.profile.verify_profile_pin import VerifyProfilePinUseCase
from app.use_cases.profile.get_manifest_urls_for_profile import (
    GetManifestUrlsForProfileUseCase,
)
from app.use_cases.profile.get_playback_history import GetPlaybackHistoryUseCase
from app.use_cases.profile.get_continue_watching import GetContinueWatchingUseCase
from app.use_cases.profile.update_playback_history import UpdatePlaybackHistoryUseCase
from security.jwt_service import IJwtService, JwtService
from app.use_cases.profile.get_meta_for_id import GetMetaForIdUseCase


class Container(containers.DeclarativeContainer):
    settings: providers.Dependency[BaseAppSettings] = providers.Dependency(
        instance_of=BaseAppSettings
    )

    redis_client = providers.Singleton(create_redis_client, settings=settings)

    db_engine = providers.Singleton(create_db_engine, settings=settings)
    db_session_factory = providers.Singleton(
        create_db_session_factory, engine=db_engine
    )
    password_hasher: providers.Factory[IPasswordHasher] = providers.Factory(
        BcryptPasswordHasher
    )
    # api_client: providers.Factory[ApiClient] = providers.Factory(
    #     ApiClient, verify_ssl=settings.provided.SSL_CERTFILE
    # )
    
    api_client: providers.Factory[ApiClient] = providers.Factory(
        ApiClient
    )

    addon_provider: providers.Factory[IAddonProvider] = providers.Factory(
        AddonProvider,
        api_client=api_client,
        ADDON_CONTROLLER_SERVICE_URL=settings.provided.ADDON_CONTROLLER_SERVICE_URL,
    )

    uow: providers.Factory[IUnitOfWork] = providers.Factory(
        SqlAlchemyUnitOfWork, session_factory=db_session_factory
    )

    authorization_policy: providers.Factory[IAuthorizationPolicy] = providers.Factory(
        AccountAuthorizationPolicy,
        uow_factory=uow.provider,
    )

    event_publisher: providers.Factory[IEventPublisher] = providers.Factory(
        RedisEventPublisher,
        redis_client=redis_client,
    )

    jwt_service: providers.Factory[IJwtService] = providers.Factory(
        JwtService,
        secret_key=settings.provided.JWT_SECRET_KEY,
        algorithm=settings.provided.JWT_ALGORITHM,
        access_token_expire_minutes=settings.provided.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
        refresh_token_expire_days=settings.provided.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )

    create_account_use_case: providers.Factory[CreateAccountUseCase] = (
        providers.Factory(
            CreateAccountUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
            event_publisher=event_publisher,
        )
    )

    find_or_create_by_social_use_case: providers.Factory[
        FindOrCreateBySocialUseCase
    ] = providers.Factory(
        FindOrCreateBySocialUseCase,
        uow_factory=uow.provider,
        event_publisher=event_publisher,
    )

    get_account_use_case: providers.Factory[GetAccountUseCase] = providers.Factory(
        GetAccountUseCase, uow_factory=uow.provider
    )

    login_use_case: providers.Factory[LoginUseCase] = providers.Factory(
        LoginUseCase,
        uow_factory=uow.provider,
        password_hasher=password_hasher,
    )

    get_profile_use_case: providers.Factory[GetProfileUseCase] = providers.Factory(
        GetProfileUseCase,
        uow_factory=uow.provider,
        authorization_policy=authorization_policy,
    )

    get_manifest_urls_for_profile_use_case: providers.Factory[
        GetManifestUrlsForProfileUseCase
    ] = providers.Factory(GetManifestUrlsForProfileUseCase, uow_factory=uow.provider)

    create_profile_use_case: providers.Factory[CreateProfileUseCase] = (
        providers.Factory(
            CreateProfileUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
            event_publisher=event_publisher,
        )
    )

    update_profile_use_case: providers.Factory[UpdateProfileUseCase] = (
        providers.Factory(
            UpdateProfileUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
            authorization_policy=authorization_policy,
            event_publisher=event_publisher,
        )
    )

    update_profile_settings_use_case: providers.Factory[
        UpdateProfileSettingsUseCase
    ] = providers.Factory(
        UpdateProfileSettingsUseCase,
        uow_factory=uow.provider,
        authorization_policy=authorization_policy,
        event_publisher=event_publisher,
    )

    verify_profile_pin_use_case: providers.Factory[VerifyProfilePinUseCase] = (
        providers.Factory(
            VerifyProfilePinUseCase,
            uow_factory=uow.provider,
            password_hasher=password_hasher,
            authorization_policy=authorization_policy,
        )
    )

    install_addon_use_case: providers.Factory[InstallAddonUseCase] = providers.Factory(
        InstallAddonUseCase,
        uow_factory=uow.provider,
        addon_provider=addon_provider,
        authorization_policy=authorization_policy,
        event_publisher=event_publisher,
    )

    uninstall_addon_use_case: providers.Factory[UninstallAddonUseCase] = (
        providers.Factory(
            UninstallAddonUseCase,
            uow_factory=uow.provider,
            authorization_policy=authorization_policy,
            event_publisher=event_publisher,
        )
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
        UninstallAddonFromAllProfilesUseCase,
        uow_factory=uow.provider,
        uninstall_addon_use_case=uninstall_addon_use_case,
    )

    get_playback_history_use_case: providers.Factory[GetPlaybackHistoryUseCase] = (
        providers.Factory(
            GetPlaybackHistoryUseCase,
            uow_factory=uow.provider,
            authorization_policy=authorization_policy,
        )
    )

    get_continue_watching_use_case: providers.Factory[GetContinueWatchingUseCase] = (
        providers.Factory(
            GetContinueWatchingUseCase,
            uow_factory=uow.provider,
            authorization_policy=authorization_policy,
        )
    )

    get_meta_for_id_use_case: providers.Factory[GetMetaForIdUseCase] = (
        providers.Factory(
            GetMetaForIdUseCase,
            api_client=api_client,
            ADDON_CONTROLLER_SERVICE_URL=settings.provided.ADDON_CONTROLLER_SERVICE_URL,
        )
    )

    update_playback_history_use_case: providers.Factory[
        UpdatePlaybackHistoryUseCase
    ] = providers.Factory(
        UpdatePlaybackHistoryUseCase,
        uow_factory=uow.provider,
        authorization_policy=authorization_policy,
        get_meta_for_id_use_case=get_meta_for_id_use_case,
    )

    update_advanced_settings_use_case: providers.Factory[
        UpdateAdvancedSettingsUseCase
    ] = providers.Factory(
        UpdateAdvancedSettingsUseCase,
        uow_factory=uow.provider,
        authorization_policy=authorization_policy,
        event_publisher=event_publisher,
    )
