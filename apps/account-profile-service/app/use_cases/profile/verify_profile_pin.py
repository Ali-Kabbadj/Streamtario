from typing import Callable
from security_factory.services.passwordservice import IPasswordHasher
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.utils.logging import log_info, log_warn


class VerifyProfilePinUseCase:
    """Handles the verification of a PIN for a private profile."""

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        password_hasher: IPasswordHasher,
        authorization_policy: IAuthorizationPolicy,
    ):
        self.uow_factory = uow_factory
        self.password_hasher = password_hasher
        self.authorization_policy = authorization_policy

    async def execute(
        self, requesting_account_id: str, profile_id: str, pin: str
    ) -> bool:
        """
        Verifies the PIN for the given profile.
        Returns True on success, raises ApiException on failure.
        """
        log_info(f"Attempting to verify PIN for profile {profile_id}")

        # Ensure the user owns the profile they are trying to unlock.
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id=requesting_account_id, profile_id=profile_id
        )

        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

            if not profile:
                raise ApiException(
                    ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
                )

            if not profile.is_private or not profile.pin_hash:
                # This case should ideally not be hit if the frontend logic is correct.
                log_warn(
                    f"PIN verification attempted on non-private profile {profile_id}"
                )
                raise ApiException(
                    ApiErrorCode.FORBIDDEN, override_message="Profile is not private."
                )

            is_pin_valid = self.password_hasher.verify(profile.pin_hash, pin)

            if not is_pin_valid:
                log_warn(f"PIN verification failed for profile {profile_id}")
                raise ApiException(
                    ApiErrorCode.INVALID_PROFILE_CREDENTIALS,
                    override_message="The PIN is incorrect.",
                )

        log_info(f"Successfully verified PIN for profile {profile_id}")
        return True
