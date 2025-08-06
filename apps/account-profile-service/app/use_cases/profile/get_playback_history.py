from typing import Callable, List, Optional
from core.pydantic.domain.profile import PlaybackHistory, Profile
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from api_contract.errors import ApiErrorCode
from domain_exceptions.exceptions import ApiException
from core.utils.logging import log_info


class GetPlaybackHistoryUseCase:
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
        content_ids: List[str],
    ) -> List[PlaybackHistory]:
        log_info(
            f"Fetching playback history for profile {profile_id}",
            data={"content_ids_count": len(content_ids)},
        )
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id, profile_id
        )

        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

        if not profile:
            raise ApiException(ApiErrorCode.PROFILE_NOT_FOUND)

        # Filter the profile's full history to only the requested content_ids
        filtered_history = [
            item for item in profile.playback_history if item.content_id in content_ids
        ]

        return filtered_history
