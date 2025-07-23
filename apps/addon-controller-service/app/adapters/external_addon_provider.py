from typing import Type, TypeVar
from pydantic import BaseModel
from http_client_factory.public_client import PublicApiClient
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider

T = TypeVar("T", bound=BaseModel)


class ExternalAddonProvider(IExternalAddonProvider):
    def __init__(self, public_api_client: PublicApiClient):
        self.public_api_client = public_api_client

    async def get[T: BaseModel](self, url: str, response_model: Type[T]) -> T | None:
        return await self.public_api_client.get(url, response_model)
