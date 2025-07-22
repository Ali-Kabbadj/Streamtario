from typing import Dict, List, Optional
from core.pydantic.auth.user.account import Account, Profile
from fastapi_factory.exceptions import NotFoundException
from .services import IAccountService


IN_MEMORY_DB: Dict[str, Account] = {}


class InMemoryAccountService(IAccountService):
    """
    A concrete implementation of IUserService that uses a simple in-memory dictionary
    to store account data. We will replace this with a real database service later.
    """

    def __init__(self, database: Dict[str, Account]):
        self.db = database
        # TODO: A real implementation would have a password hashing utility injected.

    async def create_account(self, email: str, password: str) -> Account:
        hashed_password = f"hashed_{password}"  # Dummy hashing

        new_account = Account(email=email, hashedPassword=hashed_password)
        default_profile = Profile(name="Default")
        new_account.profiles.append(default_profile)

        self.db[new_account.id] = new_account
        return new_account

    async def get_account_by_email(self, email: str) -> Optional[Account]:
        for account in self.db.values():
            if account.email == email:
                return account
        return None

    async def get_account_by_id(self, user_id: str) -> Optional[Account]:
        return self.db.get(user_id)

    async def add_profile_to_account(self, user_id: str, profile_name: str) -> Profile:
        user = await self.get_account_by_id(user_id)
        if not user:
            raise NotFoundException(details={"user_id": user_id})

        new_profile = Profile(name=profile_name)
        user.profiles.append(new_profile)
        return new_profile
