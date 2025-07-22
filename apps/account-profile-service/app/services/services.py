from abc import ABC, abstractmethod
from typing import Optional, List
from core.pydantic.auth.user.account import Account, Profile, InstalledAddon


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
