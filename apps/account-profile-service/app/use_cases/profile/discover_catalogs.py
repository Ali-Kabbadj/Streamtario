import asyncio
from typing import Awaitable, Callable, List
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.repositories.i_profile_repository import IProfileRepository
from app.domain.providers.i_addon_provider import IAddonProvider
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.catalog.catalog import DiscoveredCatalog
from fastapi_factory.exceptions import NotFoundException
from core.utils.logging import log_error


class DiscoverCatalogsUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider

    async def _fetch_manifests_for_profile(self, profile) -> List[AddonManifest]:
        async def _fetch_manifest(addon):
            try:
                return await self.addon_provider.get_manifest(addon.manifest_url)
            except Exception as e:
                log_error(
                    f"Failed to fetch manifest for {addon.manifest_id}",
                    data={"error": str(e)},
                )
                return None

        tasks = [_fetch_manifest(addon) for addon in profile.installed_addons]
        manifests = await asyncio.gather(*tasks)
        return [m for m in manifests if m is not None]

    async def execute(self, profile_id: str) -> List[DiscoveredCatalog]:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

        if not profile:
            raise NotFoundException("Profile", profile_id)

        manifests = await self._fetch_manifests_for_profile(profile)
        all_catalogs = []
        for manifest in manifests:
            for catalog in manifest.catalogs:
                all_catalogs.append(
                    DiscoveredCatalog(
                        addonName=manifest.name,
                        manifestId=manifest.id,
                        catalogId=catalog.id,
                        catalogName=catalog.name,
                        catalogType=catalog.type,
                        extraProps=(
                            [e.model_dump(by_alias=True) for e in catalog.extra]
                            if catalog.extra
                            else []
                        ),
                    )
                )
        return all_catalogs
