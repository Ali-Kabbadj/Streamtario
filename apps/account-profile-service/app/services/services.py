from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, List
from core.pydantic.auth.user.account import Account, Profile, InstalledAddon
from core.pydantic.catalog.catalog import (
    CatalogResponse,
    DiscoveredCatalog,
)
from core.pydantic.meta.meta import MetaResponse


class IAccountService(ABC):
    @abstractmethod
    async def create_account(self, email: str, password: str) -> Account:
        pass

    @abstractmethod
    async def get_account_by_id(self, account_id: str) -> Optional[Account]:
        pass


class IProfileService(ABC):
    @abstractmethod
    async def install_addon(self, profile_id: str, manifest_url: str) -> InstalledAddon:
        pass

    @abstractmethod
    async def uninstall_addon(self, profile_id: str, manifest_id: str) -> None:
        pass

    @abstractmethod
    async def install_addon_for_all_profiles(
        self, account_id: str, manifest_url: str
    ) -> dict:
        pass

    @abstractmethod
    async def uninstall_addon_from_all_profiles(
        self, account_id: str, manifest_id: str
    ) -> dict:
        pass

    @abstractmethod
    async def get_addon_catalog(
        self,
        profile_id: str,
        manifest_id: str,
        catalog_type: str,
        catalog_id: str,
        extra_props: dict,
    ) -> CatalogResponse:
        """Gets catalog content for an installed addon via the addon-controller."""
        pass

    @abstractmethod
    async def discover_catalogs(self, profile_id: str) -> List[DiscoveredCatalog]:
        """
        Fetches manifests for all installed addons and returns a unified list
        of all available catalogs for a profile.
        """
        pass

    @abstractmethod
    async def search_all_addons(self, profile_id: str, query: str) -> dict:
        """
        Searches all installed, search-enabled addons for a given query and
        returns the aggregated, categorized results.
        """
        pass

    @abstractmethod
    def stream_search_all_addons(
        self, profile_id: str, query: str
    ) -> AsyncGenerator[str, None]:
        """
        Searches all addons and yields results as JSON strings as they complete.
        """
        pass

    @abstractmethod
    async def get_meta(
        self, profile_id: str, item_type: str, item_id: str
    ) -> MetaResponse:  # ADD item_type
        """
        Gets detailed metadata for a given item ID by finding the correct
        installed addon and proxying the request to the addon-controller.
        """
        pass
