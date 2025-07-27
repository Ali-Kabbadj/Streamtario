from typing import Callable
from core.pydantic.domain.addon import InstalledAddon
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.providers.i_addon_provider import IAddonProvider
from domain_exceptions.exceptions import NotFoundException, ConflictException
from core.utils.logging import log_info
from domain_exceptions.exceptions import ApiException


class InstallAddonUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider

    async def execute(
        self, requesting_account_id: str, profile_id: str, manifest_url: str
    ) -> InstalledAddon:
        async with self.uow_factory() as uow:
            account = await uow.accounts.get_by_id(requesting_account_id)
            if not account or not any(p.id == profile_id for p in account.profiles):
                raise ApiException(
                    status_code=403,
                    message=f"Account {requesting_account_id} is not authorized to install addons for profile {profile_id}.",
                    ui_message="You are not authorized to perform this action.",
                )

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
