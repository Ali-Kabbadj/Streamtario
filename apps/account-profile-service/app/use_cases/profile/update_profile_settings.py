from typing import Callable, Dict, Any
from core.pydantic.domain.profile import Profile
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from app.domain.events.i_event_publisher import IEventPublisher
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.utils.logging import log_info
from core.pydantic.events.base import ProfileUpdatedEvent
import strawberry


class UpdateProfileSettingsUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
        event_publisher: IEventPublisher,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy
        self.event_publisher = event_publisher

    async def execute(
        self,
        requesting_account_id: str,
        profile_id: str,
        settings: Dict[str, Any],
    ) -> Profile:
        log_info(
            f"Attempting to update settings for profile {profile_id}",
            data={"account_id": requesting_account_id},
        )

        await self.authorization_policy.check_profile_ownership(
            requesting_account_id=requesting_account_id, profile_id=profile_id
        )

        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)
            if not profile:
                raise ApiException(
                    ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
                )

            update_data = {
                k: v for k, v in settings.items() if v is not strawberry.UNSET
            }
            updated_settings = profile.settings.model_copy(update=update_data)
            profile.settings = updated_settings

            updated_profile = await uow.profiles.update(profile)
            await uow.commit()

        await self.event_publisher.publish(
            ProfileUpdatedEvent(updated_fields=["settings"], profile_id=profile_id)
        )
        log_info(f"Successfully updated settings for profile {updated_profile.id}")
        return updated_profile
