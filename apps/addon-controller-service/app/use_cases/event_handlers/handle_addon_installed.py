from core.pydantic.events.base import AddonInstalledEvent
from app.domain.cache.i_profile_manifest_cache import IProfileManifestCache
from core.utils.logging import log_info


class HandleAddonInstalledEventUseCase:
    def __init__(self, cache: IProfileManifestCache):
        self.cache = cache

    async def execute(self, event: AddonInstalledEvent) -> None:
        log_info(
            f"Handling '{event.event_name}': Caching manifest for profile {event.profile_id}",
            context="event_handler",
            data=event.model_dump(mode="json"),
        )
        await self.cache.add_manifest(
            profile_id=event.profile_id,
            manifest_url=event.manifest_url,
        )
