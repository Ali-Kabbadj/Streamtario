from abc import ABC, abstractmethod
from core.pydantic.addons.manifest import AddonManifest


class IAddonProvider(ABC):
    """
    Defines the contract for an external service that provides addon-related data.
    In this service, it's ONLY used for validating manifests during installation.
    """

    @abstractmethod
    async def get_manifest(self, manifest_url: str) -> AddonManifest:
        """Fetches and validates an addon manifest from a URL."""
        pass
