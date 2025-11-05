from abc import ABC, abstractmethod
from typing import Optional
from core.pydantic.addons.manifest import AddonManifest


class IManifestCache(ABC):
    @abstractmethod
    async def get(self, manifest_url: str) -> Optional[AddonManifest]:
        """Retrieves a manifest from the cache. Returns None if not found."""
        pass

    @abstractmethod
    async def set(self, manifest_url: str, manifest: AddonManifest) -> None:
        """Stores a manifest in the cache with a predefined TTL."""
        pass
