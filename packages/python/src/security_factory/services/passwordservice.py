from abc import ABC, abstractmethod


class IPasswordHasher(ABC):
    """
    Interface for a service that can hash and verify passwords.
    """

    @abstractmethod
    def hash(self, password: str) -> str:
        """Hashes a plain-text password."""
        pass

    @abstractmethod
    def verify(self, hashed_password: str, plain_password: str) -> bool:
        """Verifies a plain-text password against a stored hash."""
        pass
