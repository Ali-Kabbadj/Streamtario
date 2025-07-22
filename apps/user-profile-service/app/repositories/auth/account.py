from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload  # <-- IMPORT THIS
from core.database.models.auth.account import AccountOrm, ProfileOrm
from typing import Optional


class AccountRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, account_id: str) -> Optional[AccountOrm]:
        stmt = (
            select(AccountOrm)
            .where(AccountOrm.id == account_id)
            .options(selectinload(AccountOrm.profiles))
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[AccountOrm]:
        stmt = (
            select(AccountOrm)
            .where(AccountOrm.email == email)
            .options(selectinload(AccountOrm.profiles))
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(self, email: str, hashed_password: str) -> AccountOrm:
        new_account = AccountOrm(email=email, hashed_password=hashed_password)
        self.session.add(new_account)
        await self.session.flush()
        return new_account
