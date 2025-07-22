from typing import Awaitable, Callable
from core.pydantic.domain.addon import InstalledAddon
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.repositories.i_profile_repository import IProfileRepository
from app.domain.providers.i_addon_provider import IAddonProvider
from fastapi_factory.exceptions import NotFoundException, ConflictException
from core.utils.logging import log_info


class InstallAddonUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider

    async def execute(self, profile_id: str, manifest_url: str) -> InstalledAddon:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)
            if not profile:
                raise NotFoundException("Profile", profile_id)

            if any(
                addon.manifest_url == manifest_url for addon in profile.installed_addons
            ):
                raise ConflictException(
                    "InstalledAddon", manifest_url, {"profile_id": profile_id}
                )

            validated_manifest = await self.addon_provider.get_manifest(manifest_url)

            new_addon = await uow.profiles.add_addon(
                profile_id=profile_id,
                manifest_url=manifest_url,
                manifest_id=validated_manifest.id,
            )
            await uow.commit()

            log_info(
                f"Successfully installed addon '{validated_manifest.id}' for profile '{profile_id}'"
            )
            return new_addon
