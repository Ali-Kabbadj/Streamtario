from abc import ABC, abstractmethod
from typing import List


class IProfileAddonManifestProvider(ABC):
    """
    Defines the contract for a service that provides the manifest URLs
    for a given profile, with a caching layer.
    """

    @abstractmethod
    async def get_manifest_urls(self, profile_id: str) -> List[str]:
        """
        Retrieves the list of manifest URLs for a profile.
        Implementations should handle caching and fetching from the authoritative source.
        """
        pass
