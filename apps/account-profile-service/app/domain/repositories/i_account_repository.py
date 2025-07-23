from abc import ABC, abstractmethod
from typing import Optional
from core.pydantic.domain.account import Account
from core.pydantic.domain.profile import Profile


class IAccountRepository(ABC):
    """
    Interface for account data operations, working with domain models.
    """

    @abstractmethod
    async def get_by_id(self, account_id: str) -> Optional[Account]:
        """Fetches an account by its ID."""
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[Account]:
        """Fetches an account by its email."""
        pass

    @abstractmethod
    async def create(self, email: str, hashed_password: str) -> Account:
        """Creates a new account and returns the complete domain model."""
        pass
