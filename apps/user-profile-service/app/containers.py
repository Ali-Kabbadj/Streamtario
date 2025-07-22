from dependency_injector import containers, providers
from fastapi_factory.settings import BaseAppSettings
from database_factory.db import create_db_engine, create_db_session_factory
from app.services.auth.account import PostgresAccountService
from .services.services import IAccountService


class Container(containers.DeclarativeContainer):
    settings: providers.Dependency[BaseAppSettings] = providers.Dependency(
        instance_of=BaseAppSettings
    )

    db_engine = providers.Singleton(create_db_engine, settings=settings)

    db_session_factory = providers.Singleton(
        create_db_session_factory, engine=db_engine
    )
    account_service: providers.Factory[IAccountService] = providers.Factory(
        PostgresAccountService,
        session_factory=db_session_factory,
    )
