from datetime import datetime
from typing import Callable, Dict, Any, Optional, Tuple
from core.pydantic.domain.profile import PlaybackHistory
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.utils.logging import log_info, log_warn
from app.use_cases.profile.get_meta_for_id import GetMetaForIdUseCase


class UpdatePlaybackHistoryUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
        get_meta_for_id_use_case: GetMetaForIdUseCase,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy
        self.get_meta_for_id_use_case = get_meta_for_id_use_case

    def _extract_ids(self, content_id: str) -> Tuple[str, Optional[int], Optional[int]]:
        parts = content_id.split(":")

        # Standard format: prefix:id:season:episode
        if len(parts) == 4 and parts[2].isdigit() and parts[3].isdigit():
            base_id = f"{parts[0]}:{parts[1]}"
            season = int(parts[2])
            episode = int(parts[3])
            return base_id, season, episode

        # Handle cases with extra parts, like kitsu IDs
        # community.anime.kitsu:kitsu:11469:1:1
        if len(parts) > 4 and parts[-2].isdigit() and parts[-1].isdigit():
            base_id = ":".join(parts[:-2])
            season = int(parts[-2])
            episode = int(parts[-1])
            return base_id, season, episode

        # Movie or Series Base ID
        return content_id, None, None

    async def execute(
        self,
        requesting_account_id: str,
        profile_id: str,
        content_id: str,
        item_type: str,
        position_seconds: int,
        duration_seconds: int,
        last_stream_details: Optional[Dict[str, Any]] = None,
    ) -> PlaybackHistory:
        log_info(
            f"Updating playback history for {profile_id}",
            data={"content_id": content_id},
        )

        await self.authorization_policy.check_profile_ownership(
            requesting_account_id, profile_id
        )

        id_for_meta_lookup, season, episode = self._extract_ids(content_id)

        imdb_id: Optional[str] = None
        if "tt" in id_for_meta_lookup:
            imdb_id = next(
                (
                    part
                    for part in id_for_meta_lookup.split(":")
                    if part.startswith("tt")
                ),
                None,
            )

        if not imdb_id:
            meta = await self.get_meta_for_id_use_case.execute(
                profile_id, id_for_meta_lookup, item_type
            )
            if meta and meta.imdb_id:
                imdb_id = meta.imdb_id
            else:
                log_warn(
                    "Could not resolve imdb_id for content_id",
                    data={"content_id": content_id},
                )

        async with self.uow_factory() as uow:
            history_item = await uow.profiles.upsert_playback_history(
                profile_id=profile_id,
                content_id=content_id,
                item_type=item_type,
                imdb_id=imdb_id,
                season=season,
                episode=episode,
                position_seconds=position_seconds,
                duration_seconds=duration_seconds,
                last_stream_details=last_stream_details,
            )
            # history_item.watched_at = datetime.now()
            await uow.commit()

        return history_item
