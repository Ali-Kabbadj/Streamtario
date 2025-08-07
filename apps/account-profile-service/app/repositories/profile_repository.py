from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, desc, func, update
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert
from core.database.models.auth.account import ProfileOrm
from core.database.models.auth.addon import InstalledAddonOrm
from core.database.models.auth.account import PlaybackHistoryOrm
from typing import List, Optional, Dict, Any
from app.domain.repositories.i_profile_repository import IProfileRepository
from core.pydantic.domain.profile import PlaybackHistory, Profile
from core.pydantic.domain.addon import InstalledAddon
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode


class ProfileRepository(IProfileRepository):
    """Manages data operations for ProfileOrm and its related models."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_playback_history_for_profile(
        self, profile_id: str, limit: int
    ) -> List[PlaybackHistory]:
        stmt = (
            select(PlaybackHistoryOrm)
            .where(PlaybackHistoryOrm.profile_id == profile_id)
            .order_by(desc(PlaybackHistoryOrm.watched_at))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        history_orms = result.scalars().all()
        return [PlaybackHistory.model_validate(h) for h in history_orms]

    async def create(
        self,
        account_id: str,
        name: str,
        avatar: Optional[str],
        is_private: bool,
        pin_hash: Optional[str],
    ) -> Profile:
        new_profile_orm = ProfileOrm(
            account_id=account_id,
            name=name,
            avatar=avatar,
            is_private=is_private,
            pin_hash=pin_hash,
        )
        self.session.add(new_profile_orm)
        await self.session.flush()

        return Profile.model_validate(new_profile_orm)

    async def update(self, profile: Profile) -> Profile:
        profile_orm = await self.session.get(ProfileOrm, profile.id)
        if not profile_orm:
            raise ApiException(
                ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile.id}
            )

        update_data = profile.model_dump(
            exclude={"id", "installed_addons", "playback_history"}, by_alias=False
        )
        for key, value in update_data.items():
            setattr(profile_orm, key, value)

        await self.session.flush()
        await self.session.refresh(
            profile_orm, attribute_names=["installed_addons", "playback_history"]
        )

        return Profile.model_validate(profile_orm)

    async def get_by_id(self, profile_id: str) -> Optional[Profile]:
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
        new_addon_orm = InstalledAddonOrm(
            profile_id=profile_id,
            manifest_url=manifest_url,
            manifest_id=manifest_id,
        )
        self.session.add(new_addon_orm)
        await self.session.flush()
        return InstalledAddon.model_validate(new_addon_orm)

    async def remove_addon(self, profile_id: str, manifest_id: str) -> bool:
        stmt = (
            delete(InstalledAddonOrm)
            .where(InstalledAddonOrm.profile_id == profile_id)
            .where(InstalledAddonOrm.manifest_id == manifest_id)
        )
        result = await self.session.execute(stmt)
        return result.rowcount > 0

    async def remove_addons_by_account(self, account_id: str, manifest_id: str) -> int:
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
        item_type: str,
        imdb_id: Optional[str],
        season: Optional[int],
        episode: Optional[int],
        position_seconds: int,
        duration_seconds: int,
        last_stream_details: Optional[Dict[str, Any]],
    ) -> PlaybackHistory:

        # 1. Find existing record by canonical ID (IMDB + S/E) if available
        existing_orm = None
        if imdb_id and item_type == "series":
            stmt = select(PlaybackHistoryOrm).where(
                PlaybackHistoryOrm.profile_id == profile_id,
                PlaybackHistoryOrm.imdb_id == imdb_id,
                PlaybackHistoryOrm.season == season,
                PlaybackHistoryOrm.episode == episode,
            )
            result = await self.session.execute(stmt)
            existing_orm = result.scalars().first()
        elif imdb_id and item_type == "movie":
            stmt = select(PlaybackHistoryOrm).where(
                PlaybackHistoryOrm.profile_id == profile_id,
                PlaybackHistoryOrm.imdb_id == imdb_id,
            )
            result = await self.session.execute(stmt)
            existing_orm = result.scalars().first()

        # 2. If not found by canonical ID, try the specific content_id
        if not existing_orm:
            stmt = select(PlaybackHistoryOrm).where(
                PlaybackHistoryOrm.profile_id == profile_id,
                PlaybackHistoryOrm.content_id == content_id,
            )
            result = await self.session.execute(stmt)
            existing_orm = result.scalars().first()

        values_to_update = {
            "content_id": content_id,
            "item_type": item_type,
            "imdb_id": imdb_id,
            "season": season,
            "episode": episode,
            "position_seconds": position_seconds,
            "duration_seconds": duration_seconds,
            "last_stream_details": last_stream_details,
            "watched_at": func.now(),
        }

        if existing_orm:
            update_stmt = (
                update(PlaybackHistoryOrm)
                .where(PlaybackHistoryOrm.id == existing_orm.id)
                .values(**values_to_update)
                .returning(PlaybackHistoryOrm)
            )
            result = await self.session.execute(update_stmt)
            updated_orm = result.scalars().one()
        else:
            # Insert a new record
            insert_stmt = (
                insert(PlaybackHistoryOrm)
                .values(profile_id=profile_id, **values_to_update)
                .returning(PlaybackHistoryOrm)
            )
            result = await self.session.execute(insert_stmt)
            updated_orm = result.scalars().one()

        await self.session.flush()
        return PlaybackHistory.model_validate(updated_orm)

    async def get_playback_history_by_imdb_id(
        self, profile_id: str, imdb_id: str
    ) -> List[PlaybackHistory]:
        stmt = (
            select(PlaybackHistoryOrm)
            .where(PlaybackHistoryOrm.profile_id == profile_id)
            .where(PlaybackHistoryOrm.imdb_id == imdb_id)
            .order_by(desc(PlaybackHistoryOrm.watched_at))
        )
        result = await self.session.execute(stmt)
        history_orms = result.scalars().all()
        return [PlaybackHistory.model_validate(h) for h in history_orms]

    async def get_playback_history_by_content_ids(
        self, profile_id: str, content_ids: List[str]
    ) -> List[PlaybackHistory]:
        stmt = (
            select(PlaybackHistoryOrm)
            .where(PlaybackHistoryOrm.profile_id == profile_id)
            .where(PlaybackHistoryOrm.content_id.in_(content_ids))
        )
        result = await self.session.execute(stmt)
        history_orms = result.scalars().all()
        return [PlaybackHistory.model_validate(h) for h in history_orms]
