from typing import Callable, List, Optional
from core.pydantic.domain.profile import PlaybackHistory
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.utils.logging import log_info


class GetPlaybackHistoryUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy

    # CORRECTED: The signature and logic now depend on the arguments provided
    async def execute(
        self,
        requesting_account_id: str,
        profile_id: str,
        imdb_id: Optional[str] = None,
        content_ids: Optional[List[str]] = None,
    ) -> List[PlaybackHistory]:
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id, profile_id
        )

        async with self.uow_factory() as uow:
            if imdb_id:
                log_info(
                    f"Fetching history for profile {profile_id} by imdb_id {imdb_id}"
                )
                return await uow.profiles.get_playback_history_by_imdb_id(
                    profile_id=profile_id, imdb_id=imdb_id
                )
            elif content_ids:
                log_info(f"Fetching history for profile {profile_id} by content_ids")
                return await uow.profiles.get_playback_history_by_content_ids(
                    profile_id=profile_id, content_ids=content_ids
                )
            return []
