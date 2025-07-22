from abc import ABC, abstractmethod
from typing import Type, Union, TypeVar
from pydantic import BaseModel
from https_factory.models import SuccessResponse, ErrorResponse

T = TypeVar("T", bound=BaseModel)


class IExternalAddonProvider(ABC):
    """
    Defines the contract for fetching data from external addon URLs.
    This completely abstracts away HTTPX and the ApiClient.
    """

    @abstractmethod
    async def get(
        self, url: str, response_model: Type[T]
    ) -> Union[SuccessResponse[T], ErrorResponse]:
        """Performs a GET request and validates the response against a Pydantic model."""
        pass
