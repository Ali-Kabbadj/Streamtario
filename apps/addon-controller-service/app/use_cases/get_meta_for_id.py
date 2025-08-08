from typing import Optional
from .get_manifest import GetManifestUseCase
from .get_meta import GetMetaUseCase
from core.pydantic.meta.meta import MetaItem


class GetMetaForIdUseCase:
    def __init__(
        self,
        get_meta_use_case: GetMetaUseCase,
    ):
        self.get_meta_use_case = get_meta_use_case

    async def execute(self, content_id: str, item_type: str) -> Optional[MetaItem]:
        parts = content_id.split(":")
        if len(parts) < 2:
            return None

        # This is still a placeholder for a dynamic manifest lookup, but the logic
        # is now correctly isolated in the use case layer.
        manifest_map = {
            "community.anime.kitsu": "https://anime-kitsu.strem.fun/manifest.json",
            "com.cinemeta": "https://v3-cinemeta.strem.io/manifest.json",
            "pw.ers.netflix-catalog": "https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json",
            "tmdb-addon": "https://94c8cb9f702d-tmdb-addon.baby-beamup.club/manifest.json",
        }
        manifest_url = manifest_map.get(parts[0])

        if not manifest_url:
            return None

        # The actual ID for metadata lookup is often the second part.
        item_id = parts[1]

        meta_response = await self.get_meta_use_case.execute(
            manifest_url, item_type, item_id
        )

        if meta_response and meta_response.meta:
            return meta_response.meta
        return None
