from abc import ABC, abstractmethod
from typing import Optional
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.catalog.catalog import CatalogResponse
from core.pydantic.meta.meta import MetaResponse


class IAddonService(ABC):
    """Interface for the addon fetching and parsing logic."""

    @abstractmethod
    async def get_manifest(self, url: str) -> AddonManifest:
        """Fetches an addon manifest from a URL and validates it."""
        pass

    @abstractmethod
    async def get_catalog(
        self, manifest_url: str, catalog_type: str, catalog_id: str, extra_props: dict
    ) -> CatalogResponse:
        """Fetches an addon manifest from a URL and validates it."""
        pass

    @abstractmethod
    async def get_meta(
        self, manifest_url: str, item_id: str, item_type: Optional[str]
    ) -> MetaResponse:  # Add item_type
        """Fetches an addon manifest from a URL and validates it."""
        pass
