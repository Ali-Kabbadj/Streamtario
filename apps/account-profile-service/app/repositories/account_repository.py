from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from core.database.models.auth.account import AccountOrm, ProfileOrm
from typing import Optional


class AccountRepository:
    """Manages data operations for the AccountOrm model."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, account_id: str) -> Optional[AccountOrm]:
        """Fetches an account by ID, eagerly loading its profiles and their addons."""
        stmt = (
            select(AccountOrm)
            .where(AccountOrm.id == account_id)
            .options(
                selectinload(AccountOrm.profiles).selectinload(
                    ProfileOrm.installed_addons
                )
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[AccountOrm]:
        """Fetches an account by email, eagerly loading its profiles and their addons."""
        stmt = (
            select(AccountOrm)
            .where(AccountOrm.email == email)
            .options(
                selectinload(AccountOrm.profiles).selectinload(
                    ProfileOrm.installed_addons
                )
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(self, email: str, hashed_password: str) -> AccountOrm:
        new_account = AccountOrm(email=email, hashed_password=hashed_password)
        self.session.add(new_account)
        await self.session.flush()
        return new_account
