from typing import Callable, Optional
from core.pydantic.domain.profile import Profile
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from api_contract.errors import ApiErrorCode
from domain_exceptions.exceptions import ApiException


class GetProfileUseCase:
    """Use case to fetch a single profile by its ID, enforcing authorization rules."""

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy

    async def execute(
        self, profile_id: str, requesting_account_id: Optional[str] = None
    ) -> Profile:
        await self.authorization_policy.check_can_view_profile(
            requesting_account_id=requesting_account_id, profile_id=profile_id
        )

        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

        if not profile:
            raise ApiException(
                ApiErrorCode.PROFILE_NOT_FOUND, details={"account_id": profile_id}
            )

        return profile
