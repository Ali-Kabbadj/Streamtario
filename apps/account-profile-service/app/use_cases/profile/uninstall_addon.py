from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from domain_exceptions.exceptions import NotFoundException
from core.utils.logging import log_info
from typing import Callable
from domain_exceptions.exceptions import NotFoundException, ApiException


class UninstallAddonUseCase:
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(
        self, requesting_account_id: str, profile_id: str, manifest_id: str
    ) -> None:
        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_id(requesting_account_id)
            if not account or not any(p.id == profile_id for p in account.profiles):
                raise ApiException(
                    status_code=403,
                    message=f"Account {requesting_account_id} is not authorized to uninstall addons for profile {profile_id}.",
                    ui_message="You are not authorized to perform this action.",
                )

            deleted = await uow.profiles.remove_addon(profile_id, manifest_id)
            if not deleted:
                raise NotFoundException("Addon with manifest_id", manifest_id)
            await uow.commit()

        log_info(
            f"Successfully uninstalled addon '{manifest_id}' from profile '{profile_id}'"
        )
