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

    # --- NEW METHODS ---
    @abstractmethod
    async def get_by_google_id(self, google_id: str) -> Optional[Account]:
        """Fetches an account by its Google ID."""
        pass

    @abstractmethod
    async def get_by_facebook_id(self, facebook_id: str) -> Optional[Account]:
        """Fetches an account by its Facebook ID."""
        pass

    @abstractmethod
    async def create(
        self,
        email: str,
        hashed_password: Optional[str] = None,
        google_id: Optional[str] = None,
        facebook_id: Optional[str] = None,
    ) -> Account:
        """Creates a new account and returns the complete domain model."""
        pass
