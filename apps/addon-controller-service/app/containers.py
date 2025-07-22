from dependency_injector import containers, providers
from https_factory.client import ApiClient
from .services.addon_service import HttpsAddonService


class Container(containers.DeclarativeContainer):
    api_client: providers.Factory[ApiClient] = providers.Factory(ApiClient)

    addon_service: providers.Factory[HttpsAddonService] = providers.Factory(
        HttpsAddonService,
        api_client=api_client,
    )
