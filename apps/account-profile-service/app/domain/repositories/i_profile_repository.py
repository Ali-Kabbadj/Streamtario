from abc import ABC, abstractmethod
from typing import Optional
from core.pydantic.domain.profile import Profile
from core.pydantic.domain.addon import InstalledAddon


class IProfileRepository(ABC):
    """Interface for profile and addon data access."""

    @abstractmethod
    async def get_by_id(self, profile_id: str) -> Optional[Profile]:
        pass

    @abstractmethod
    async def add_addon(
        self, profile_id: str, manifest_url: str, manifest_id: str
    ) -> InstalledAddon:
        pass

    @abstractmethod
    async def remove_addon(self, profile_id: str, manifest_id: str) -> bool:
        pass

    @abstractmethod
    async def remove_addons_by_account(self, account_id: str, manifest_id: str) -> int:
        pass

    @abstractmethod
    async def create_default_for_account(self, account_id: str) -> Profile:
        """Creates a default profile for a new account."""
        pass
