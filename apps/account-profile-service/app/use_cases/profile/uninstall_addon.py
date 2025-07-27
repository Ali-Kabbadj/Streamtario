from app.domain.events.i_event_publisher import IEventPublisher
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info
from typing import Callable
from app.domain.policies.i_authorization_policy import IAuthorizationPolicy
from core.pydantic.events.base import AddonUninstalledEvent


class UninstallAddonUseCase:

    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        authorization_policy: IAuthorizationPolicy,
        event_publisher: IEventPublisher,
    ):
        self.uow_factory = uow_factory
        self.authorization_policy = authorization_policy
        self.event_publisher = event_publisher

    async def execute(
        self, requesting_account_id: str, profile_id: str, manifest_id: str
    ) -> None:
        await self.authorization_policy.check_profile_ownership(
            requesting_account_id=requesting_account_id, profile_id=profile_id
        )

        async with self.uow_factory() as uow:
            # We need to fetch the profile to find the URL from the manifest ID
            profile = await uow.profiles.get_by_id(profile_id)
            if not profile:
                raise ApiException(
                    ApiErrorCode.PROFILE_NOT_FOUND, details={"profile_id": profile_id}
                )

            addon_to_remove = next(
                (
                    addon
                    for addon in profile.installed_addons
                    if addon.manifest_id == manifest_id
                ),
                None,
            )
            if not addon_to_remove:
                raise ApiException(
                    ApiErrorCode.ADDON_NOT_FOUND, details={"manifest_id": manifest_id}
                )

            manifest_url_to_remove = addon_to_remove.manifest_url

            deleted = await uow.profiles.remove_addon(profile_id, manifest_id)
            if not deleted:
                raise ApiException(
                    ApiErrorCode.ADDON_NOT_FOUND,
                    details={"profile_id": profile_id, "manifest_id": manifest_id},
                )
            await uow.commit()

        await self.event_publisher.publish(
            AddonUninstalledEvent(
                account_id=requesting_account_id,
                profile_id=profile_id,
                manifest_id=manifest_id,
                manifest_url=manifest_url_to_remove,
            )
        )

        log_info(
            f"Successfully uninstalled addon '{manifest_id}' from profile '{profile_id}'"
        )
