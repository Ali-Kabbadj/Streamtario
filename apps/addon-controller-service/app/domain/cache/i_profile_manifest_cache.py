from abc import ABC, abstractmethod
from typing import List


class IProfileManifestCache(ABC):
    """
    Defines the interface for a cache that stores manifest URLs per profile.
    """

    @abstractmethod
    async def get_manifests(self, profile_id: str) -> List[str]:
        """Retrieves all manifest URLs for a given profile ID."""
        pass

    @abstractmethod
    async def add_manifest(self, profile_id: str, manifest_url: str) -> None:
        """Adds a manifest URL to a profile's cache."""
        pass

    @abstractmethod
    async def remove_manifest(
        self, profile_id: str, manifest_id: str, manifest_url: str
    ) -> None:
        """Removes a manifest URL from a profile's cache."""
        pass
