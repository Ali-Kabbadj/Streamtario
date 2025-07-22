from dependency_injector import containers, providers
from https_factory.client import ApiClient
from .services.addon_service import HttpAddonService


class Container(containers.DeclarativeContainer):
    api_client: providers.Factory[ApiClient] = providers.Factory(ApiClient)

    # Provide the concrete implementation. The abstraction is handled at the injection point.
    addon_service: providers.Factory[HttpAddonService] = providers.Factory(
        HttpAddonService,
        api_client=api_client,
    )
