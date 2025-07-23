from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.repositories.i_account_repository import IAccountRepository
from .install_addon import InstallAddonUseCase
from domain_exceptions.exceptions import NotFoundException, ConflictException
from core.utils.logging import log_info
from typing import Callable, Awaitable


class InstallAddonForAllProfilesUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        install_addon_use_case: InstallAddonUseCase,
    ):
        self.uow_factory = uow_factory
        self.install_addon_use_case = install_addon_use_case

    async def execute(self, account_id: str, manifest_url: str) -> dict:
        async with self.uow_factory() as uow:
            # We only read the account here, no commit needed for this part.
            account = await uow.accounts.get_by_id(account_id)

        if not account:
            raise NotFoundException("Account", account_id)

        results = {"success": [], "skipped": []}
        # The child use case (install_addon) will manage its own transactions.
        for profile in account.profiles:
            try:
                installed = await self.install_addon_use_case.execute(
                    profile.id, manifest_url
                )
                results["success"].append(
                    {"profile_id": profile.id, "addon_id": installed.id}
                )
            except ConflictException:
                results["skipped"].append(
                    {"profile_id": profile.id, "reason": "Already installed."}
                )
        log_info(
            f"Completed account-wide install for '{manifest_url}' on account '{account_id}'"
        )
        return results
