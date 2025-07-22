from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from core.database.models.auth.account import ProfileOrm
from core.database.models.auth.addon import InstalledAddonOrm
from typing import Optional
from app.domain.repositories.i_profile_repository import IProfileRepository
from core.pydantic.domain.profile import Profile
from core.pydantic.domain.addon import InstalledAddon


class ProfileRepository(IProfileRepository):
    """Manages data operations for ProfileOrm and its related models."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_default_for_account(self, account_id: str) -> ProfileOrm:
        default_profile_orm = ProfileOrm(name="Default", account_id=account_id)
        self.session.add(default_profile_orm)
        await self.session.flush()
        return default_profile_orm

    async def get_by_id(self, profile_id: str) -> Optional[Profile]:
        """Fetches a single profile by its ID, eagerly loading its addons."""
        stmt = (
            select(ProfileOrm)
            .where(ProfileOrm.id == profile_id)
            .options(selectinload(ProfileOrm.installed_addons))
        )
        result = await self.session.execute(stmt)
        profile_orm = result.scalars().first()
        return Profile.model_validate(profile_orm) if profile_orm else None

    async def add_addon(
        self, profile_id: str, manifest_url: str, manifest_id: str
    ) -> InstalledAddon:
        """Adds a new InstalledAddonOrm to the session."""
        new_addon_orm = InstalledAddonOrm(
            profile_id=profile_id,
            manifest_url=manifest_url,
            manifest_id=manifest_id,
        )
        self.session.add(new_addon_orm)
        await self.session.flush()
        return InstalledAddon.model_validate(new_addon_orm)

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
