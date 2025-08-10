from abc import ABC, abstractmethod
from typing import Type, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T", bound="BaseModel")


class IExternalAddonProvider(ABC):
    @abstractmethod
    async def get(
        self, url: str, response_model: Type[T], timeout: Optional[float] = None
    ) -> T | None:
        """Performs a GET request and returns the parsed model or None on failure."""
        pass

    @abstractmethod
    async def get_raw_text(self, url: str) -> str | None:
        """Performs a GET request and returns the raw text content or None on failure."""
        pass
