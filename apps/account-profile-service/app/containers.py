from dependency_injector import containers, providers
from fastapi_factory.settings import BaseAppSettings
from database_factory.db import create_db_engine, create_db_session_factory
from security_factory.services.passwordservice import IPasswordHasher
from .services.account_service import AccountService
from .services.profile_service import ProfileService
from .services.services import IAccountService, IProfileService
from security_factory.password import BcryptPasswordHasher
from https_factory.client import ApiClient


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

    # --- New Service Providers ---
    profile_service: providers.Factory[IProfileService] = providers.Factory(
        ProfileService,
        session_factory=db_session_factory,
        api_client=api_client,
        addon_controller_url=settings.provided.ADDON_CONTROLLER_URL,
    )

    account_service: providers.Factory[IAccountService] = providers.Factory(
        AccountService,
        session_factory=db_session_factory,
        password_hasher=password_hasher,
    )
