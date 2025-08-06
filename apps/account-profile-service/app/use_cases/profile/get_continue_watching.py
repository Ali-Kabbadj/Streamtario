from typing import Callable, List
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.pydantic.domain.profile import PlaybackHistory
from core.utils.logging import log_info


class GetContinueWatchingUseCase:
    """Fetches a list of the most recent, in-progress playback history items."""

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy

    async def execute(
        self, requesting_account_id: str, profile_id: str
    ) -> List[PlaybackHistory]:
        log_info(f"Fetching continue watching list for profile {profile_id}")
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id, profile_id
        )

        async with self.uow_factory() as uow:
            history_items = await uow.profiles.get_playback_history_for_profile(
                profile_id=profile_id, limit=20
            )

        return history_items
