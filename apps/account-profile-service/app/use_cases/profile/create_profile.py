from typing import Callable, Optional
from core.pydantic.domain.profile import Profile
from security_factory.services.passwordservice import IPasswordHasher
from domain_exceptions.exceptions import ApiException  # <-- Change imports
from api_contract.errors import ApiErrorCode  # <-- Add this import
from app.domain.events.i_event_publisher import IEventPublisher
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from core.utils.logging import log_info
from core.pydantic.events.base import ProfileCreatedEvent

MAX_PROFILES_PER_ACCOUNT = 10


class CreateProfileUseCase:
    """Handles the creation of a new profile for an account."""

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        password_hasher: IPasswordHasher,
        event_publisher: IEventPublisher,
    ):
        self.uow_factory = uow_factory
        self.password_hasher = password_hasher
        self.event_publisher = event_publisher

    async def execute(
        self,
        account_id: str,
        name: str,
        avatar: Optional[str],
        is_private: bool,
        pin: Optional[str],
    ) -> Profile:
        log_info(f"Attempting to create profile '{name}' for account {account_id}")

        pin_hash: Optional[str] = None
        if is_private:
            if not pin or len(pin) != 4 or not pin.isdigit():
                # --- This is the new way to raise errors ---
                raise ApiException(
                    error_code=ApiErrorCode.VALIDATION_PIN_REQUIRED,
                    details={"field": "pin"},
                )
            pin_hash = self.password_hasher.hash(pin)

        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_id(account_id)
            if not account:
                raise ApiException(error_code=ApiErrorCode.ACCOUNT_NOT_FOUND)

            if len(account.profiles) >= MAX_PROFILES_PER_ACCOUNT:
                raise ApiException(
                    error_code=ApiErrorCode.ACCOUNT_PROFILE_LIMIT_REACHED,
                    details={
                        "limit": MAX_PROFILES_PER_ACCOUNT,
                        "current": len(account.profiles),
                    },
                )

            new_profile = await uow.profiles.create(
                account_id=account_id,
                name=name,
                avatar=avatar,
                is_private=is_private,
                pin_hash=pin_hash,
            )
            await uow.commit()

        await self.event_publisher.publish(
            ProfileCreatedEvent(
                name=new_profile.name or "Default",
                profile_id=new_profile.id,
                account_id=account_id,
            )
        )

        log_info(
            f"Successfully created profile {new_profile.id} ('{name}') for account {account_id}"
        )
        return new_profile
