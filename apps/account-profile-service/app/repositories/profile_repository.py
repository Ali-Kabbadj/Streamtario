from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from core.database.models.auth.account import ProfileOrm
from core.database.models.auth.addon import InstalledAddonOrm
from typing import Optional


class ProfileRepository:
    """Manages data operations for ProfileOrm and its related models."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, profile_id: str) -> Optional[ProfileOrm]:
        """Fetches a single profile by its ID, eagerly loading its addons."""
        stmt = (
            select(ProfileOrm)
            .where(ProfileOrm.id == profile_id)
            .options(selectinload(ProfileOrm.installed_addons))
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def add_addon(self, addon: InstalledAddonOrm) -> InstalledAddonOrm:
        """Adds a new InstalledAddonOrm to the session."""
        self.session.add(addon)
        await self.session.flush()
        return addon

    async def remove_addon(self, profile_id: str, manifest_id: str) -> bool:
        """Deletes an addon by its manifest_id from a specific profile."""
        stmt = (
            delete(InstalledAddonOrm)
            .where(InstalledAddonOrm.profile_id == profile_id)
            .where(InstalledAddonOrm.manifest_id == manifest_id)
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def remove_addons_by_account(self, account_id: str, manifest_id: str) -> int:
        """Deletes all installations of an addon from all profiles on an account."""
        profile_ids_stmt = select(ProfileOrm.id).where(
            ProfileOrm.account_id == account_id
        )
        stmt = (
            delete(InstalledAddonOrm)
            .where(InstalledAddonOrm.profile_id.in_(profile_ids_stmt))
            .where(InstalledAddonOrm.manifest_id == manifest_id)
        )
        result = await self.session.execute(stmt)
        return result.rowcount
