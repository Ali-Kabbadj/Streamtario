from abc import ABC, abstractmethod
from typing import Optional
from core.pydantic.auth.user.account import Account, Profile


class IAccountService(ABC):
    """Interface for account and profile management."""

    @abstractmethod
    async def create_account(self, email: str, password: str) -> Account:
        """Creates a new account with a default profile."""
        pass

    @abstractmethod
    async def get_account_by_email(self, email: str) -> Optional[Account]:
        """Retrieves a account by their email address."""
        pass

    @abstractmethod
    async def get_account_by_id(self, account_id: str) -> Optional[Account]:
        """Retrieves a account by their ID."""
        pass

    @abstractmethod
    async def add_profile_to_account(
        self, account_id: str, profile_name: str
    ) -> Profile:
        """Adds a new profile to an existing account."""
        pass
