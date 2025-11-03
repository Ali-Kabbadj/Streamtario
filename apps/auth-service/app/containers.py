from dependency_injector import containers, providers
from app.settings import AuthSettings
from http_client_factory.client import ApiClient
from security.jwt_service import IJwtService, JwtService


class Container(containers.DeclarativeContainer):
    settings: providers.Dependency[AuthSettings] = providers.Dependency(
        instance_of=AuthSettings
    )

    api_client: providers.Factory[ApiClient] = providers.Factory(
        ApiClient,
    )

    jwt_service: providers.Factory[IJwtService] = providers.Factory(
        JwtService,
        secret_key=settings.provided.JWT_SECRET_KEY,
        algorithm=settings.provided.JWT_ALGORITHM,
        access_token_expire_minutes=settings.provided.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
        refresh_token_expire_days=settings.provided.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )
