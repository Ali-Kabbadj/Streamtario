import asyncio
from typing import List, Optional
from core.pydantic.addons.manifest import AddonManifest, Resource
from core.pydantic.meta.meta import (
    MetaItem,
    AppExtras,
)
from domain_exceptions.exceptions import ApiException
from api_contract.errors import ApiErrorCode
from core.utils.logging import log_info, log_error, log_warn
from .get_manifest import GetManifestUseCase
from .get_meta import GetMetaUseCase
from ..domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)

AGGREGATION_TIMEOUT_SECONDS = 3.0


class FindAndGetMetaUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        get_meta_use_case: GetMetaUseCase,
        profile_addon_manifest_provider: IProfileAddonManifestProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.get_meta_use_case = get_meta_use_case
        self.profile_addon_manifest_provider = profile_addon_manifest_provider

    def _merge_meta_items(
        self, original_id: str, meta_items: List[MetaItem]
    ) -> Optional[MetaItem]:
        if not meta_items:
            return None
        base_meta = meta_items[0].model_copy()
        base_meta.id = original_id
        # ... (rest of merge logic is correct and does not need changes)
        seen_genres = set(base_meta.genres or [])
        seen_videos = {
            (
                f"{v.season}:{v.episode}"
                if v.season is not None and v.episode is not None
                else v.id
            )
            for v in base_meta.videos or []
        }
        seen_directors = set(base_meta.director or [])
        seen_writers = set(base_meta.writer or [])
        seen_trailers = {f"{t.source}:{t.type}" for t in base_meta.trailers or []}
        seen_trailer_streams = {
            ts.ytId for ts in base_meta.trailerStreams or [] if ts.ytId
        }
        seen_links = {f"{link.name}:{link.url}" for link in base_meta.links or []}
        seen_cast = {
            member.name
            for member in (
                base_meta.app_extras.cast
                if base_meta.app_extras and base_meta.app_extras.cast
                else []
            )
            if member.name
        }

        for other_meta in meta_items[1:]:
            if not base_meta.poster and other_meta.poster:
                base_meta.poster = other_meta.poster
            if not base_meta.background and other_meta.background:
                base_meta.background = other_meta.background
            if not base_meta.logo and other_meta.logo:
                base_meta.logo = other_meta.logo
            if not base_meta.description and other_meta.description:
                base_meta.description = other_meta.description
            if not base_meta.imdbRating and other_meta.imdbRating:
                base_meta.imdbRating = other_meta.imdbRating
            if not base_meta.runtime and other_meta.runtime:
                base_meta.runtime = other_meta.runtime
            if not base_meta.country and other_meta.country:
                base_meta.country = other_meta.country
            if not base_meta.year and other_meta.year:
                base_meta.year = other_meta.year
            if not base_meta.released and other_meta.released:
                base_meta.released = other_meta.released
            if other_meta.genres:
                for genre in other_meta.genres:
                    if genre not in seen_genres:
                        base_meta.genres = (base_meta.genres or []) + [genre]
                        seen_genres.add(genre)
            if other_meta.videos:
                for video in other_meta.videos:
                    video_key = (
                        f"{video.season}:{video.episode}"
                        if video.season is not None and video.episode is not None
                        else video.id
                    )
                    if video_key not in seen_videos:
                        base_meta.videos = (base_meta.videos or []) + [video]
                        seen_videos.add(video_key)
            if other_meta.director:
                for director in other_meta.director:
                    if director not in seen_directors:
                        base_meta.director = (base_meta.director or []) + [director]
                        seen_directors.add(director)
            if other_meta.writer:
                for writer in other_meta.writer:
                    if writer not in seen_writers:
                        base_meta.writer = (base_meta.writer or []) + [writer]
                        seen_writers.add(writer)
            if other_meta.trailers:
                for trailer in other_meta.trailers:
                    trailer_key = f"{trailer.source}:{trailer.type}"
                    if trailer_key not in seen_trailers:
                        base_meta.trailers = (base_meta.trailers or []) + [trailer]
                        seen_trailers.add(trailer_key)
            if other_meta.trailerStreams:
                for ts in other_meta.trailerStreams:
                    if ts.ytId and ts.ytId not in seen_trailer_streams:
                        base_meta.trailerStreams = (base_meta.trailerStreams or []) + [
                            ts
                        ]
                        seen_trailer_streams.add(ts.ytId)
            if other_meta.links:
                for link in other_meta.links:
                    link_key = f"{link.name}:{link.url}"
                    if link_key not in seen_links:
                        base_meta.links = (base_meta.links or []) + [link]
                        seen_links.add(link_key)
            if other_meta.app_extras and other_meta.app_extras.cast:
                if not base_meta.app_extras:
                    base_meta.app_extras = AppExtras(cast=[])
                base_meta.app_extras.cast = base_meta.app_extras.cast or []
                for member in other_meta.app_extras.cast:
                    if member.name and member.name not in seen_cast:
                        base_meta.app_extras.cast.append(member)
                        seen_cast.add(member.name)
        if base_meta.videos:
            base_meta.videos.sort(key=lambda v: (v.season or 0, v.episode or 0))
        return base_meta

    async def _fetch_manifest(self, url: str) -> Optional[AddonManifest]:
        try:
            return await self.get_manifest_use_case.execute(url)
        except Exception:
            log_error(f"Failed to fetch or validate manifest at {url}")
            return None

    async def execute(
        self, profile_id: str, item_type: str, item_id: str
    ) -> Optional[MetaItem]:

        if ":" not in item_id:
            raise ApiException(
                ApiErrorCode.VALIDATION_ERROR,
                details={"reason": f"Item ID '{item_id}' must be prefixed."},
            )

        log_info(f"Aggregating meta for '{item_id}'")

        manifest_urls = await self.profile_addon_manifest_provider.get_manifest_urls(
            profile_id
        )
        if not manifest_urls:
            return None

        manifest_tasks = [self._fetch_manifest(url) for url in manifest_urls]
        manifest_results = await asyncio.gather(*manifest_tasks, return_exceptions=True)
        all_manifests = [m for m in manifest_results if isinstance(m, AddonManifest)]

        _routing_prefix, addon_specific_id = item_id.split(":", 1)
        universal_imdb_id: Optional[str] = None
        initial_meta: Optional[MetaItem] = None

        if addon_specific_id.startswith("tt"):
            universal_imdb_id = addon_specific_id
        else:
            originating_manifest = next(
                (m for m in all_manifests if m and m.id == _routing_prefix), None
            )
            if originating_manifest and originating_manifest.manifest_url:
                log_info(
                    f"Translating ID via originating addon: '{originating_manifest.name}'"
                )
                initial_response = await self.get_meta_use_case.execute(
                    manifest_url=originating_manifest.manifest_url,
                    item_id=addon_specific_id,
                    item_type=item_type,
                    timeout=AGGREGATION_TIMEOUT_SECONDS,
                )
                if initial_response and initial_response.meta:
                    initial_meta = initial_response.meta
                    universal_imdb_id = initial_meta.imdb_id

        if not universal_imdb_id:
            log_warn(f"Could not resolve a universal IMDb ID for '{item_id}'.")
            return initial_meta

        log_info(f"Universal IMDb ID is '{universal_imdb_id}'. Querying all providers.")

        addons_to_query = [
            m
            for m in all_manifests
            if m
            and any(
                r.name == "meta" and item_type in (r.types or m.types or [])
                for r in m.resources
            )
        ]

        if initial_meta:
            addons_to_query = [m for m in addons_to_query if m.id != _routing_prefix]

        if not addons_to_query:
            log_info("No other metadata providers to query.")
            return initial_meta

        log_info(
            f"Querying {len(addons_to_query)} additional addons in parallel.",
            data={"addons": [m.name for m in addons_to_query]},
        )

        meta_tasks = [
            self.get_meta_use_case.execute(
                m.manifest_url,
                universal_imdb_id,
                item_type,
                timeout=AGGREGATION_TIMEOUT_SECONDS,
            )
            for m in addons_to_query
            if m.manifest_url
        ]

        results = await asyncio.gather(*meta_tasks, return_exceptions=True)

        successful_meta_items: List[MetaItem] = []
        if initial_meta:
            successful_meta_items.append(initial_meta)

        for i, result in enumerate(results):
            addon_name = addons_to_query[i].name
            if isinstance(result, BaseException):
                log_warn(
                    f"Metadata fetch failed for addon '{addon_name}'.",
                    data={"error": str(result)},
                )
            elif result and result.meta:
                successful_meta_items.append(result.meta)

        if not successful_meta_items:
            log_error(f"All providers failed to return metadata for '{item_id}'.")
            return None

        merged_meta = self._merge_meta_items(item_id, successful_meta_items)
        log_info(
            f"Successfully aggregated metadata for '{item_id}' from {len(successful_meta_items)} sources."
        )

        return merged_meta
