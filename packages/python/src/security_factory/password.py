import bcrypt
from security_factory.services.passwordservice import IPasswordHasher


class BcryptPasswordHasher(IPasswordHasher):
    """
    A password hasher implementation that uses the bcrypt algorithm.
    """

    def hash(self, password: str) -> str:
        """Hashes a plain-text password."""
        # It's crucial to encode the password to bytes before hashing
        pwd_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed_bytes = bcrypt.hashpw(pwd_bytes, salt)
        # Decode the result back to a string for database storage
        return hashed_bytes.decode("utf-8")

    def verify(self, hashed_password: str, plain_password: str) -> bool:
        """Verifies a plain-text password against a stored hash."""
        try:
            pwd_bytes = plain_password.encode("utf-8")
            hashed_bytes = hashed_password.encode("utf-8")
            return bcrypt.checkpw(pwd_bytes, hashed_bytes)
        except (ValueError, TypeError):
            # This can happen if the hashed_password format is invalid
            return False
