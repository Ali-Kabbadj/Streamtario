from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from core.pydantic.auth.user.account import Account, Profile
from fastapi_factory.exceptions import NotFoundException
from typing import Optional
from app.repositories.auth.account import AccountRepository
from app.services.services import IAccountService


class PostgresAccountService(IAccountService):
    """
    A concrete implementation of IAccountService that uses a PostgreSQL
    database via a repository for data storage.
    """

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory
        # TODO: A real implementation would have a password hashing utility injected.

    async def create_account(self, email: str, password: str) -> Account:
        async with self.session_factory() as session:
            repo = AccountRepository(session)

            # Dummy hashing
            hashed_password = f"hashed_{password}"

            # Business logic: Create account and a default profile
            new_account_orm = await repo.create(email, hashed_password)
            default_profile = Profile(name="Default")

            # The ORM model from the DB is converted to a Pydantic schema for the response
            account_schema = Account.model_validate(new_account_orm)
            account_schema.profiles.append(default_profile)

            await session.commit()
            return account_schema

    async def get_account_by_id(self, account_id: str) -> Optional[Account]:
        async with self.session_factory() as session:
            repo = AccountRepository(session)
            account_orm = await repo.get_by_id(account_id)
            if account_orm:
                return Account.model_validate(account_orm)
            return None

    async def get_account_by_email(self, email: str) -> Optional[Account]:
        async with self.session_factory() as session:
            repo = AccountRepository(session)
            account_orm = await repo.get_by_email(email)
            if account_orm:
                return Account.model_validate(account_orm)
            return None

    async def add_profile_to_account(
        self, account_id: str, profile_name: str
    ) -> Profile:
        # Implementation for this would follow the same pattern:
        # create session, create repo, get account, add profile, commit.
        raise NotImplementedError
