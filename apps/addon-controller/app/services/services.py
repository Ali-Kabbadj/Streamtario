from abc import ABC, abstractmethod
from core.pydantic.addons.manifest import AddonManifest


class IAddonService(ABC):
    """Interface for the addon fetching and parsing logic."""

    @abstractmethod
    async def get_manifest(self, url: str) -> AddonManifest:
        """Fetches an addon manifest from a URL and validates it."""
        pass
