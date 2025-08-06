from typing import Callable
from core.pydantic.domain.profile import PlaybackHistory
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.utils.logging import log_info


class UpdatePlaybackHistoryUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy

    async def execute(
        self,
        requesting_account_id: str,
        profile_id: str,
        content_id: str,
        position_seconds: int,
        duration_seconds: int,
    ) -> PlaybackHistory:
        log_info(
            f"Updating playback history for profile {profile_id}",
            data={
                "content_id": content_id,
                "position": position_seconds,
                "duration": duration_seconds,
            },
        )
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id, profile_id
        )

        async with self.uow_factory() as uow:
            history_item = await uow.profiles.upsert_playback_history(
                profile_id=profile_id,
                content_id=content_id,
                position_seconds=position_seconds,
                duration_seconds=duration_seconds,
            )
            await uow.commit()

        return history_item
