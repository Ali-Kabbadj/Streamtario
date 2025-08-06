from abc import ABC, abstractmethod
from typing import Optional
from core.pydantic.domain.profile import Profile, PlaybackHistory
from core.pydantic.domain.addon import InstalledAddon


class IProfileRepository(ABC):
    """Interface for profile and addon data access."""

    @abstractmethod
    async def get_by_id(self, profile_id: str) -> Optional[Profile]:
        pass

    @abstractmethod
    async def create(
        self,
        account_id: str,
        name: str,
        avatar: Optional[str],
        is_private: bool,
        pin_hash: Optional[str],
    ) -> Profile:
        """Creates a new profile for an account."""
        pass

    @abstractmethod
    async def update(self, profile: Profile) -> Profile:
        """Updates an existing profile."""
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
    async def upsert_playback_history(
        self,
        profile_id: str,
        content_id: str,
        position_seconds: int,
        duration_seconds: int,
    ) -> PlaybackHistory:
        pass
