import asyncio
from typing import List
from urllib.parse import quote
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.stream.stream import Stream, StreamResponse
from core.utils.logging import log_info, log_warn
from .get_manifest import GetManifestUseCase
from ..domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)
from .find_and_get_meta import FindAndGetMetaUseCase


class GetStreamsUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
        profile_addon_manifest_provider: IProfileAddonManifestProvider,
        find_and_get_meta_use_case: FindAndGetMetaUseCase,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider
        self.profile_addon_manifest_provider = profile_addon_manifest_provider
        self.find_and_get_meta_use_case = find_and_get_meta_use_case

    async def _fetch_streams_for_manifest(
        self, manifest: AddonManifest, item_type: str, item_id: str
    ) -> List[Stream]:
        if not manifest.manifest_url:
            return []

        base_url = manifest.manifest_url.rsplit("/", 1)[0]
        encoded_id = quote(item_id)
        stream_url = f"{base_url}/stream/{item_type}/{encoded_id}.json"

        log_info(f"Fetching streams from {stream_url}", data={"addon": manifest.name})
        response = await self.addon_provider.get(stream_url, StreamResponse)

        if not response:
            return []

        streams = response.streams
        for stream in streams:
            stream.addon_name = manifest.name
            if stream.info_hash and stream.file_idx is None:
                log_warn(
                    "Stream found with infoHash but no fileIdx. Defaulting to 0.",
                    data={"stream_name": stream.name},
                )
                stream.file_idx = 0

        return streams

    def _get_id_prefix(self, item_id: str) -> str | None:
        if not item_id:
            return None
        if item_id.startswith("tt"):
            return "tt"
        if item_id.startswith("tmdb"):
            return "tmdb"
        if item_id.startswith("kitsu"):
            return "kitsu"
        if ":" in item_id:
            return item_id.split(":", 1)[0]
        return None

    async def execute(
        self, profile_id: str, item_type: str, item_id: str
    ) -> List[Stream]:

        manifest_urls = await self.profile_addon_manifest_provider.get_manifest_urls(
            profile_id
        )
        if not manifest_urls:
            return []

        all_manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        stream_search_id = item_id
        cinemeta_manifest = next(
            (m for m in all_manifests if m and "cinemeta" in m.id), None
        )

        item_id_parts = item_id.split(":")

        id_for_meta_lookup = item_id
        if item_type == "series" and len(item_id_parts) >= 3:
            # Reconstruct the series ID from the episode ID for the meta lookup
            # e.g., "prefix:id:s:e" -> "prefix:id"
            id_for_meta_lookup = ":".join(item_id_parts[:-2])

        if cinemeta_manifest and cinemeta_manifest.manifest_url:
            log_info(
                "Found Cinemeta. Attempting to translate ID via official metadata.",
                data={"id_for_meta_lookup": id_for_meta_lookup},
            )

            meta_response = await self.find_and_get_meta_use_case.execute(
                profile_id, item_type, id_for_meta_lookup
            )
            if meta_response and meta_response.imdb_id:
                imdb_id = meta_response.imdb_id
                log_info(
                    f"Successfully translated ID '{id_for_meta_lookup}' to IMDb ID '{imdb_id}'"
                )
                if item_type == "series" and len(item_id_parts) >= 3:
                    stream_search_id = (
                        f"{imdb_id}:{item_id_parts[-2]}:{item_id_parts[-1]}"
                    )
                else:
                    stream_search_id = imdb_id
            else:
                log_warn(
                    "Cinemeta lookup failed to return an IMDb ID. Using original ID.",
                    data={"item_id": item_id},
                )
        else:
            log_warn(
                "Cinemeta addon not found. Stream results may be limited.",
                data={"item_id": item_id},
            )

        base_id_for_prefix = stream_search_id.split(":")[0]
        base_id_prefix = self._get_id_prefix(base_id_for_prefix)

        if not base_id_prefix:
            log_warn(
                "Could not determine ID prefix from stream search ID.",
                data={"stream_search_id": stream_search_id},
            )
            return []

        relevant_manifests = [
            m
            for m in all_manifests
            if m
            and any(
                r.name == "stream"
                and item_type in (r.types or m.types)
                and (not r.id_prefixes or base_id_prefix in r.id_prefixes)
                for r in m.resources
            )
        ]

        if not relevant_manifests:
            log_warn(
                "No relevant streaming addons found for this item.",
                data={"item_type": item_type, "stream_search_id": stream_search_id},
            )
            return []

        stream_tasks = [
            self._fetch_streams_for_manifest(m, item_type, stream_search_id)
            for m in relevant_manifests
        ]
        results = await asyncio.gather(*stream_tasks)
        all_streams = [stream for sublist in results for stream in sublist]
        log_info(
            f"Aggregated {len(all_streams)} streams from {len(relevant_manifests)} addons for ID '{stream_search_id}'."
        )
        return all_streams
