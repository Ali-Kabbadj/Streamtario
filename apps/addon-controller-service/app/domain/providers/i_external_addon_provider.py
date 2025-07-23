from abc import ABC, abstractmethod
from typing import Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class IExternalAddonProvider(ABC):
    @abstractmethod
    async def get(self, url: str, response_model: Type[T]) -> T | None:
        """Performs a GET request and returns the parsed model or None on failure."""
        pass
