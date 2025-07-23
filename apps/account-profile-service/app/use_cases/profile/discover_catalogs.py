import asyncio
from typing import List, Callable
from app.domain.interfaces.i_unit_of_work import IUnitOfWork
from app.domain.providers.i_addon_provider import IAddonProvider
from core.pydantic.catalog.catalog import DiscoveredCatalog
from domain_exceptions.exceptions import NotFoundException
from core.utils.logging import log_error


class DiscoverCatalogsUseCase:
    def __init__(
        self,
        uow_factory: Callable[[], IUnitOfWork],
        addon_provider: IAddonProvider,
    ):
        self.uow_factory = uow_factory
        self.addon_provider = addon_provider

    async def execute(self, profile_id: str) -> List[DiscoveredCatalog]:
        async with self.uow_factory() as uow:
            profile = await uow.profiles.get_by_id(profile_id)

        if not profile:
            raise NotFoundException("Profile", profile_id)

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
        manifests = [m for m in await asyncio.gather(*tasks) if m is not None]

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
