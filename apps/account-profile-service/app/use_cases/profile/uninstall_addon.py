from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.repositories.i_profile_repository import IProfileRepository
from domain_exceptions.exceptions import NotFoundException
from core.utils.logging import log_info
from typing import Callable


class UninstallAddonUseCase:
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory

    async def execute(self, profile_id: str, manifest_id: str) -> None:
        async with self.uow_factory() as uow:
            deleted = await uow.profiles.remove_addon(profile_id, manifest_id)
            if not deleted:
                raise NotFoundException("Addon with manifest_id", manifest_id)
            await uow.commit()

        log_info(
            f"Successfully uninstalled addon '{manifest_id}' from profile '{profile_id}'"
        )
