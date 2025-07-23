from abc import ABC, abstractmethod
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.catalog.catalog import CatalogResponse
from core.pydantic.meta.meta import MetaResponse


class IAddonProvider(ABC):
    """
    Defines the contract for an external service that provides addon-related data,
    like manifests, catalogs, and metadata.
    """

    @abstractmethod
    async def get_manifest(self, manifest_url: str) -> AddonManifest:
        """Fetches and validates an addon manifest from a URL."""
        pass

    @abstractmethod
    async def get_catalog(
        self, manifest_url: str, catalog_type: str, catalog_id: str, extra_props: dict
    ) -> CatalogResponse:
        """Fetches catalog content from a specific addon."""
        pass

    @abstractmethod
    async def get_meta(
        self, manifest_url: str, item_type: str, item_id: str
    ) -> MetaResponse:
        """Fetches detailed metadata for an item from a specific addon."""
        pass
