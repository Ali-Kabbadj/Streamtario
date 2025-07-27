from typing import Callable, List, Optional
from core.pydantic.domain.profile import Profile
from security_factory.services.passwordservice import IPasswordHasher
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from app.domain.events.i_event_publisher import IEventPublisher
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.utils.logging import log_info
from core.pydantic.events.base import ProfileUpdatedEvent

from app.use_cases import account


class UpdateProfileUseCase:
    """Handles updating an existing profile's attributes."""

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        password_hasher: IPasswordHasher,
        authorization_policy: IAuthorizationPolicy,
        event_publisher: IEventPublisher,
    ):
        self.uow_factory = uow_factory
        self.password_hasher = password_hasher
        self.authorization_policy = authorization_policy
        self.event_publisher = event_publisher

    async def execute(
        self,
        requesting_account_id: str,
        profile_id: str,
        name: Optional[str],
        avatar: Optional[str],
        is_private: Optional[bool],
        pin: Optional[str],
    ) -> Profile:
        log_info(
            f"Attempting to update profile {profile_id} for account {requesting_account_id}"
        )

        await self.authorization_policy.check_profile_ownership(
            requesting_account_id=requesting_account_id, profile_id=profile_id
        )
        updated_fields = []
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)
            if not profile:
                raise ApiException(
                    ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
                )

            if name is not None:
                updated_fields.append("name")
                profile.name = name
            if avatar is not None:
                updated_fields.append("avatar")
                profile.avatar = avatar

            if is_private is True:
                profile.is_private = True
                if not pin or len(pin) != 4 or not pin.isdigit():
                    raise ApiException(
                        ApiErrorCode.VALIDATION_PIN_REQUIRED,
                        details={"field": "pin"},
                    )
                updated_fields.append("is_private")
                updated_fields.append("pin")
                profile.pin_hash = self.password_hasher.hash(pin)
            elif is_private is False:
                updated_fields.append("is_private")
                profile.is_private = False
                profile.pin_hash = None

            updated_profile = await uow.profiles.update(profile)
            await uow.commit()

        await self.event_publisher.publish(
            ProfileUpdatedEvent(updated_fields=updated_fields, profile_id=profile_id)
        )
        log_info(f"Successfully updated profile {updated_profile.id}")
        return updated_profile
