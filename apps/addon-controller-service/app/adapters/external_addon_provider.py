from typing import Type, Union, TypeVar
from pydantic import BaseModel
from https_factory.client import ApiClient
from https_factory.models import SuccessResponse, ErrorResponse
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider

T = TypeVar("T", bound=BaseModel)


class ExternalAddonProvider(IExternalAddonProvider):
    """
    The concrete HTTP implementation for fetching data from external addon URLs.
    This class is a thin wrapper around the generic ApiClient.
    """

    def __init__(self, api_client: ApiClient):
        self.api_client = api_client

    async def get(
        self, url: str, response_model: Type[T]
    ) -> Union[SuccessResponse[T], ErrorResponse]:
        # For now, it's a direct pass-through. In the future, this is where
        # you could add caching logic (like checking Redis before calling the api_client).
        return await self.api_client.get(url, response_model)
