from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database.models.auth.account import AccountOrm, ProfileOrm
from core.pydantic.auth.user.account import Account as AccountSchema
from typing import Optional


class AccountRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, account_id: str) -> Optional[AccountOrm]:
        return await self.session.get(AccountOrm, account_id)

    async def get_by_email(self, email: str) -> Optional[AccountOrm]:
        result = await self.session.execute(
            select(AccountOrm).where(AccountOrm.email == email)
        )
        return result.scalars().first()

    async def create(self, email: str, hashed_password: str) -> AccountOrm:
        new_account = AccountOrm(email=email, hashed_password=hashed_password)
        self.session.add(new_account)
        # We need to flush to get the ID for the profile relationship
        await self.session.flush()
        return new_account
