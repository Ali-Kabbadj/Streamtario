import asyncio
from typing import Awaitable, Callable
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.repositories.i_profile_repository import IProfileRepository
from app.domain.providers.i_addon_provider import IAddonProvider
from core.pydantic.meta.meta import MetaResponse
from domain_exceptions.exceptions import (
    NotFoundException,
    ValidationException,
    AddonProviderException,
)
from core.utils.logging import log_info
from core.pydantic.domain.addon import InstalledAddon
from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession

from app.repositories.profile_repository import ProfileRepository


class GetItemMetaUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider

    async def execute(
        self, profile_id: str, item_type: str, item_id: str
    ) -> MetaResponse:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

            if not profile:
                raise NotFoundException("Profile", profile_id)

            if ":" not in item_id:
                raise ValidationException(
                    message="Invalid ID format.", details={"item_id": item_id}
                )

            item_prefix_part = item_id.split(":")[0]
            log_info(f"Extracted item prefix: '{item_prefix_part}'")

            async def _fetch_manifest_with_addon(addon: InstalledAddon):
                try:
                    manifest = await self.addon_provider.get_manifest(
                        addon.manifest_url
                    )
                    return manifest, addon  # Return both
                except Exception:
                    return None, None

            tasks = [
                _fetch_manifest_with_addon(addon) for addon in profile.installed_addons
            ]
            results = await asyncio.gather(*tasks)

            manifest_addon_pairs = [
                (m, a) for m, a in results if m is not None and a is not None
            ]
            log_info(f"Fetched {len(manifest_addon_pairs)} manifests for profile.")

            responsible_manifest = None
            responsible_addon = None
            debug_lookups = {}
            for manifest, addon in manifest_addon_pairs:
                meta_resource = next(
                    (res for res in manifest.resources if res.name == "meta"), None
                )
                if not meta_resource:
                    debug_lookups[manifest.id] = "No 'meta' resource found."
                    continue

                prefixes = meta_resource.id_prefixes or manifest.id_prefixes or []
                normalized_prefixes = [p.rstrip(":") for p in prefixes]
                debug_lookups[manifest.id] = (
                    f"Checked against prefixes: {normalized_prefixes}"
                )

                if item_prefix_part in normalized_prefixes:
                    log_info(f"Found responsible manifest: '{manifest.id}'")
                    responsible_manifest = manifest
                    responsible_addon = addon
                    break

            if not responsible_manifest or not responsible_addon:
                raise AddonProviderException(
                    looking_for=f"Metadata for prefix '{item_prefix_part}'",
                    attempted_lookups=debug_lookups,
                )

            log_info(
                f"Proxying meta request to addon provider for manifest: {responsible_manifest.id}"
            )
            return await self.addon_provider.get_meta(
                manifest_url=responsible_addon.manifest_url,
                item_type=item_type,
                item_id=item_id,
            )
