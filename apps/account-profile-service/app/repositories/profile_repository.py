from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert
from core.database.models.auth.account import ProfileOrm
from core.database.models.auth.addon import InstalledAddonOrm
from core.database.models.auth.account import PlaybackHistoryOrm
from typing import List, Optional
from app.domain.repositories.i_profile_repository import IProfileRepository
from core.pydantic.domain.profile import PlaybackHistory, Profile
from core.pydantic.domain.addon import InstalledAddon
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode


class ProfileRepository(IProfileRepository):
    """Manages data operations for ProfileOrm and its related models."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        account_id: str,
        name: str,
        avatar: Optional[str],
        is_private: bool,
        pin_hash: Optional[str],
    ) -> Profile:
        """Creates a new profile for an account."""
        new_profile_orm = ProfileOrm(
            account_id=account_id,
            name=name,
            avatar=avatar,
            is_private=is_private,
            pin_hash=pin_hash,
        )
        self.session.add(new_profile_orm)
        await self.session.flush()

        return Profile(
            id=new_profile_orm.id,
            name=new_profile_orm.name,
            avatar=new_profile_orm.avatar,
            isPrivate=new_profile_orm.is_private,
            pinHash=new_profile_orm.pin_hash,
            installedAddons=[],
        )

    async def update(self, profile: Profile) -> Profile:
        """
        Updates a profile and returns the full, eagerly-loaded domain model.
        """
        profile_orm = await self.session.get(ProfileOrm, profile.id)
        if not profile_orm:
            raise ApiException(
                ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile.id}
            )

        profile_orm.name = profile.name or "Default"
        profile_orm.avatar = (
            profile.avatar
            or "https://i.pinimg.com/736x/5b/50/e7/5b50e75d07c726d36f397f6359098f58.jpg"
        )
        profile_orm.is_private = profile.is_private
        profile_orm.pin_hash = profile.pin_hash or ""

        await self.session.flush()
        self.session.expire(profile_orm)

        stmt = (
            select(ProfileOrm)
            .where(ProfileOrm.id == profile.id)
            .options(selectinload(ProfileOrm.installed_addons))
        )
        result = await self.session.execute(stmt)
        updated_orm = result.scalars().one()

        return Profile.model_validate(updated_orm)

    async def get_by_id(self, profile_id: str) -> Optional[Profile]:
        """Fetches a single profile by its ID, eagerly loading its addons and history."""
        stmt = (
            select(ProfileOrm)
            .where(ProfileOrm.id == profile_id)
            .options(
                selectinload(ProfileOrm.installed_addons),
                selectinload(ProfileOrm.playback_history),
            )
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

    async def upsert_playback_history(
        self,
        profile_id: str,
        content_id: str,
        position_seconds: int,
        duration_seconds: int,
    ) -> PlaybackHistory:
        """
        Creates a new playback history entry or updates an existing one
        for the same profile and content.
        """
        stmt = (
            insert(PlaybackHistoryOrm)
            .values(
                profile_id=profile_id,
                content_id=content_id,
                position_seconds=position_seconds,
                duration_seconds=duration_seconds,
            )
            .on_conflict_do_update(
                index_elements=["profile_id", "content_id"],
                set_={
                    "position_seconds": position_seconds,
                    "duration_seconds": duration_seconds,
                },
            )
            .returning(PlaybackHistoryOrm)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        updated_orm = result.scalars().one()
        return PlaybackHistory.model_validate(updated_orm)
