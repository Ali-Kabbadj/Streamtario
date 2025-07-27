from typing import Callable, Optional
from core.pydantic.domain.profile import Profile
from security_factory.services.passwordservice import IPasswordHasher
from domain_exceptions.exceptions import (
    ValidationException,
    NotFoundException,
    ApiException,
)
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from core.utils.logging import log_info


class UpdateProfileUseCase:
    """Handles updating an existing profile's attributes."""

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        password_hasher: IPasswordHasher,
    ):
        self.uow_factory = uow_factory
        self.password_hasher = password_hasher

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

        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_id(requesting_account_id)
            if not account or not any(p.id == profile_id for p in account.profiles):
                raise ApiException(
                    status_code=403,
                    message=f"Account {requesting_account_id} is not authorized to update profile {profile_id}.",
                    ui_message="You are not authorized to perform this action.",
                )

            profile = await uow.profiles.get_by_id(profile_id)
            if not profile:
                raise NotFoundException("Profile", profile_id)

            if name is not None:
                profile.name = name
            if avatar is not None:
                profile.avatar = avatar

            if is_private is True:
                profile.is_private = True
                if not pin or len(pin) != 4 or not pin.isdigit():
                    raise ValidationException(
                        message="A 4-digit PIN is required to make a profile private.",
                        ui_message="A 4-digit PIN must be provided to set or change the PIN on a private profile.",
                        details={"field": "pin"},
                    )
                profile.pin_hash = self.password_hasher.hash(pin)
            elif is_private is False:
                profile.is_private = False
                profile.pin_hash = None

            updated_profile = await uow.profiles.update(profile)
            await uow.commit()

        log_info(f"Successfully updated profile {updated_profile.id}")
        return updated_profile
