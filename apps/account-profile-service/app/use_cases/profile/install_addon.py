from typing import Callable
from core.pydantic.domain.addon import InstalledAddon
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.providers.i_addon_provider import IAddonProvider
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info


class InstallAddonUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
        authorization_policy: IAuthorizationPolicy,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider
        self.authorization_policy = authorization_policy

    async def execute(
        self, requesting_account_id: str, profile_id: str, manifest_url: str
    ) -> InstalledAddon:
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id=requesting_account_id, profile_id=profile_id
        )
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)
            if not profile:
                raise ApiException(
                    ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
                )

            if any(
                addon.manifest_url == manifest_url for addon in profile.installed_addons
            ):
                raise ApiException(
                    ApiErrorCode.ADDON_ALREADY_INSTALLED,
                    details={"profile_id": profile_id, "manifest_url": manifest_url},
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
