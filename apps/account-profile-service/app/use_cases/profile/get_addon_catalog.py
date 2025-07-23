from typing import Awaitable, Callable
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.repositories.i_profile_repository import IProfileRepository
from app.domain.providers.i_addon_provider import IAddonProvider
from core.pydantic.catalog.catalog import CatalogResponse
from domain_exceptions.exceptions import NotFoundException
from core.utils.logging import log_info


class GetAddonCatalogUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider

    async def execute(
        self,
        profile_id: str,
        manifest_id: str,
        catalog_type: str,
        catalog_id: str,
        extra_props: dict,
    ) -> CatalogResponse:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

        if not profile:
            raise NotFoundException("Profile", profile_id)

        installed_addon = next(
            (a for a in profile.installed_addons if a.manifest_id == manifest_id), None
        )
        if not installed_addon:
            raise NotFoundException("Installed Addon with manifest_id", manifest_id)

        log_info(
            f"Proxying catalog request for profile '{profile_id}' to addon-provider."
        )
        return await self.addon_provider.get_catalog(
            manifest_url=installed_addon.manifest_url,
            catalog_type=catalog_type,
            catalog_id=catalog_id,
            extra_props=extra_props,
        )
