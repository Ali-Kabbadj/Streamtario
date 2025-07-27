from typing import Callable, Optional
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode


class AccountAuthorizationPolicy(IAuthorizationPolicy):
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def check_profile_ownership(
        self, requesting_account_id: str, profile_id: str
    ) -> None:
        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_id(requesting_account_id)
            if not account:
                raise ApiException(error_code=ApiErrorCode.FORBIDDEN)
            if not any(p.id == profile_id for p in account.profiles):
                raise ApiException(error_code=ApiErrorCode.FORBIDDEN)

    async def check_can_view_profile(
        self, requesting_account_id: Optional[str], profile_id: str
    ) -> None:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)
            if not profile:
                raise ApiException(
                    ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
                )

            if profile.is_private:
                if not requesting_account_id:
                    raise ApiException(error_code=ApiErrorCode.FORBIDDEN)

                await self.check_profile_ownership(requesting_account_id, profile_id)
