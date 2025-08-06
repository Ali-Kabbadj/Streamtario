from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from core.database.models.auth.account import AccountOrm, ProfileOrm
from typing import Optional
from app.domain.repositories.i_account_repository import IAccountRepository
from core.pydantic.domain.account import Account


class AccountRepository(IAccountRepository):
    """Manages data operations for the AccountOrm model."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def _get_base_query(self):
        """Creates a base query with all necessary eager loads."""
        return select(AccountOrm).options(
            selectinload(AccountOrm.profiles).options(
                selectinload(ProfileOrm.installed_addons),
                selectinload(ProfileOrm.playback_history),
            )
        )

    async def get_by_id(self, account_id: str) -> Optional[Account]:
        """Fetches an account by ID, eagerly loading all relationships."""
        stmt = self._get_base_query().where(AccountOrm.id == account_id)
        result = await self.session.execute(stmt)
        account_orm = result.scalars().first()
        return Account.model_validate(account_orm) if account_orm else None

    async def get_by_email(self, email: str) -> Optional[Account]:
        """Fetches an account by email, eagerly loading all relationships."""
        stmt = self._get_base_query().where(AccountOrm.email == email)
        result = await self.session.execute(stmt)
        account_orm = result.scalars().first()
        return Account.model_validate(account_orm) if account_orm else None

    async def get_by_google_id(self, google_id: str) -> Optional[Account]:
        """Fetches an account by Google ID, eagerly loading all relationships."""
        stmt = self._get_base_query().where(AccountOrm.google_id == google_id)
        result = await self.session.execute(stmt)
        account_orm = result.scalars().first()
        return Account.model_validate(account_orm) if account_orm else None

    async def get_by_facebook_id(self, facebook_id: str) -> Optional[Account]:
        """Fetches an account by Facebook ID, eagerly loading all relationships."""
        stmt = self._get_base_query().where(AccountOrm.facebook_id == facebook_id)
        result = await self.session.execute(stmt)
        account_orm = result.scalars().first()
        return Account.model_validate(account_orm) if account_orm else None

    async def create(
        self,
        email: str,
        hashed_password: Optional[str] = None,
        google_id: Optional[str] = None,
        facebook_id: Optional[str] = None,
    ) -> AccountOrm:
        new_account_orm = AccountOrm(
            email=email,
            hashed_password=hashed_password,
            google_id=google_id,
            facebook_id=facebook_id,
        )
        self.session.add(new_account_orm)
        await self.session.flush()
        return new_account_orm
