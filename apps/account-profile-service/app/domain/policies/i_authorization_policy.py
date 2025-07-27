from abc import ABC, abstractmethod
from typing import Optional


class IAuthorizationPolicy(ABC):
    """
    Defines the interface for authorization checks within the domain.
    Implementations of this interface will contain the actual logic
    to verify if an action is permitted.
    """

    @abstractmethod
    async def check_profile_ownership(
        self, requesting_account_id: str, profile_id: str
    ) -> None:
        """
        Checks if the given account ID owns the specified profile ID.
        Raises an ApiException with status 403 (Forbidden) if the check fails.
        """
        pass

    @abstractmethod
    async def check_can_view_profile(
        self, requesting_account_id: Optional[str], profile_id: str
    ) -> None:
        """
        Checks if a profile can be viewed.
        - Public profiles can be viewed by anyone (including unauthenticated users).
        - Private profiles can only be viewed by the owning account.
        Raises an ApiException with status 403 (Forbidden) if the check fails.
        """
        pass
