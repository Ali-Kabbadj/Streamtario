from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from core.pydantic.domain.profile import Profile, PlaybackHistory
from core.pydantic.domain.addon import InstalledAddon


class IProfileRepository(ABC):
    """Interface for profile and addon data access."""

    @abstractmethod
    async def get_by_id(self, profile_id: str) -> Optional[Profile]:
        pass

    @abstractmethod
    async def get_playback_history_for_profile(
        self, profile_id: str, limit: int
    ) -> List[PlaybackHistory]:
        pass

    # CORRECTED: This method is necessary for the GraphQL query
    @abstractmethod
    async def get_playback_history_by_imdb_id(
        self, profile_id: str, imdb_id: str
    ) -> List[PlaybackHistory]:
        pass

    @abstractmethod
    async def get_playback_history_by_content_ids(
        self, profile_id: str, content_ids: List[str]
    ) -> List[PlaybackHistory]:
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
        item_type: str,
        imdb_id: Optional[str],
        season: Optional[int],
        episode: Optional[int],
        position_seconds: int,
        duration_seconds: int,
        last_stream_details: Optional[Dict[str, Any]],
    ) -> PlaybackHistory:
        pass
