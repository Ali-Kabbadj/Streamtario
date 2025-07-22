from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
from .services import IProfileService
from ..repositories.profile_repository import ProfileRepository
from ..repositories.account_repository import AccountRepository
from core.pydantic.auth.user.account import InstalledAddon
from core.pydantic.addons.manifest import AddonManifest
from core.utils.logging import log_error, log_info, log_http
from https_factory.client import ApiClient
from https_factory.models import ErrorResponse
from fastapi_factory.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
)
from urllib.parse import urlencode


class ProfileService(IProfileService):
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        api_client: ApiClient,
        addon_controller_url: str,
    ):
        self.session_factory = session_factory
        self.api_client = api_client
        self.addon_controller_url = addon_controller_url

    async def install_addon(self, profile_id: str, manifest_url: str) -> InstalledAddon:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            profile_orm = await repo.get_by_id(profile_id)
            if not profile_orm:
                raise NotFoundException("Profile", profile_id)

            if any(
                addon.manifest_url == manifest_url
                for addon in profile_orm.installed_addons
            ):
                raise ConflictException(
                    "InstalledAddon", manifest_url, {"profile_id": profile_id}
                )

            params = urlencode({"url": manifest_url})
            full_url = f"{self.addon_controller_url}/api/v1/manifest?{params}"

            manifest_response = await self.api_client.get(
                url=full_url, response_model=AddonManifest
            )

            if isinstance(manifest_response, ErrorResponse):
                raise ValidationException(
                    "The manifest URL is invalid or could not be reached.",
                    manifest_response.details,
                )

            validated_manifest = manifest_response.data

            from core.database.models.auth.addon import InstalledAddonOrm

            new_addon_orm = InstalledAddonOrm(
                profile_id=profile_id,
                manifest_url=manifest_url,
                manifest_id=validated_manifest.id,
            )

            saved_addon_orm = await repo.add_addon(new_addon_orm)
            await session.commit()
            log_info(
                f"Successfully installed addon '{validated_manifest.id}' for profile '{profile_id}'"
            )
            return InstalledAddon.model_validate(saved_addon_orm)

    async def uninstall_addon(self, profile_id: str, manifest_id: str) -> None:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            deleted = await repo.remove_addon(profile_id, manifest_id)
            if not deleted:
                raise NotFoundException("Addon with manifest_id", manifest_id)
            await session.commit()
            log_info(
                f"Successfully uninstalled addon '{manifest_id}' from profile '{profile_id}'"
            )

    async def install_addon_for_all_profiles(
        self, account_id: str, manifest_url: str
    ) -> dict:
        async with self.session_factory() as session:
            account_repo = AccountRepository(session)
            account_orm = await account_repo.get_by_id(account_id)
            if not account_orm:
                raise NotFoundException("Account", account_id)

            results = {"success": [], "skipped": []}
            for profile in account_orm.profiles:
                try:
                    installed = await self.install_addon(profile.id, manifest_url)
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

    async def uninstall_addon_from_all_profiles(
        self, account_id: str, manifest_id: str
    ) -> dict:
        async with self.session_factory() as session:
            repo = ProfileRepository(session)
            account_repo = AccountRepository(session)
            # Check account exists
            if not await account_repo.get_by_id(account_id):
                raise NotFoundException("Account", account_id)

            deleted_count = await repo.remove_addons_by_account(account_id, manifest_id)
            if deleted_count == 0:
                raise NotFoundException("Addon with manifest_id", manifest_id)

            await session.commit()
            summary = {
                "manifest_id": manifest_id,
                "deleted_from_profiles": deleted_count,
            }
            log_info(
                f"Completed account-wide uninstall of '{manifest_id}' for account '{account_id}'",
                data=summary,
            )
            return summary
