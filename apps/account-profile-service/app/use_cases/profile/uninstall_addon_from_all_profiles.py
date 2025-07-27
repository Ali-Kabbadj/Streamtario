from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from .uninstall_addon import UninstallAddonUseCase
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info
from typing import Callable, List


class UninstallAddonFromAllProfilesUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        uninstall_addon_use_case: UninstallAddonUseCase,
    ):
        self.uow_factory = uow_factory
        self.uninstall_addon_use_case = uninstall_addon_use_case

    async def execute(self, account_id: str, manifest_id: str) -> dict:
        profiles_to_process: List[str] = []
        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_id(account_id)
            if not account:
                raise ApiException(
                    ApiErrorCode.ACCOUNT_NOT_FOUND, details={"account_id": account_id}
                )

            for p in account.profiles:
                if any(
                    addon.manifest_id == manifest_id for addon in p.installed_addons
                ):
                    profiles_to_process.append(p.id)

            if not profiles_to_process:
                raise ApiException(
                    ApiErrorCode.ADDON_NOT_FOUND,
                    details={"account_id": account_id, "manifest_id": manifest_id},
                )

        deleted_count = 0
        for profile_id in profiles_to_process:
            try:
                await self.uninstall_addon_use_case.execute(
                    requesting_account_id=account_id,
                    profile_id=profile_id,
                    manifest_id=manifest_id,
                )
                deleted_count += 1
            except ApiException as e:
                log_info(
                    f"Failed to uninstall {manifest_id} from profile {profile_id}: {e.code}"
                )

        summary = {"manifest_id": manifest_id, "deleted_from_profiles": deleted_count}
        log_info(
            f"Completed account-wide uninstall of '{manifest_id}' for account '{account_id}'",
            data=summary,
        )
        return summary
