from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from domain_exceptions.exceptions import NotFoundException
from core.utils.logging import log_info
from typing import Callable, Awaitable


class UninstallAddonFromAllProfilesUseCase:
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(self, account_id: str, manifest_id: str) -> dict:
        async with self.uow_factory() as uow:
            if not await uow.accounts.get_by_id(account_id):
                raise NotFoundException("Account", account_id)

            deleted_count = await uow.profiles.remove_addons_by_account(
                account_id, manifest_id
            )
            if deleted_count == 0:
                raise NotFoundException("Addon with manifest_id", manifest_id)
            await uow.commit()

        summary = {"manifest_id": manifest_id, "deleted_from_profiles": deleted_count}
        log_info(
            f"Completed account-wide uninstall of '{manifest_id}' for account '{account_id}'",
            data=summary,
        )
        return summary
