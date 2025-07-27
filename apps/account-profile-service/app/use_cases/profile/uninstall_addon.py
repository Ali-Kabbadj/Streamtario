from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info
from typing import Callable
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy


class UninstallAddonUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy

    async def execute(
        self, requesting_account_id: str, profile_id: str, manifest_id: str
    ) -> None:
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id=requesting_account_id, profile_id=profile_id
        )

        async with self.uow_factory() as uow:
            deleted = await uow.profiles.remove_addon(profile_id, manifest_id)
            if not deleted:
                raise ApiException(
                    ApiErrorCode.ADDON_NOT_FOUND,
                    details={"profile_id": profile_id, "manifest_id": manifest_id},
                )
            await uow.commit()

        log_info(
            f"Successfully uninstalled addon '{manifest_id}' from profile '{profile_id}'"
        )
