import asyncio
from typing import List
from urllib.parse import quote
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.stream.stream import Stream, StreamResponse
from core.utils.logging import log_info, log_warn
from .get_manifest import GetManifestUseCase


class GetStreamsUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider

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

        streams = response.streams if response else []
        for stream in streams:
            stream.addon_name = manifest.name

        return streams

    def _get_id_prefix(self, item_id: str) -> str | None:
        if item_id.startswith("tt"):
            return "tt"
        if item_id.startswith("tmdb"):
            return "tmdb"
        if ":" in item_id:
            return item_id.split(":", 1)[0]
        return None

    async def execute(
        self, manifest_urls: List[str], item_type: str, item_id: str
    ) -> List[Stream]:
        METADATA_PROVIDERS = {"com.linvo.cinemeta"}
        item_id_parts = item_id.split(":")
        base_id = item_id

        if item_id_parts[0] in METADATA_PROVIDERS and len(item_id_parts) > 1:
            base_id = ":".join(item_id_parts[1:])

        base_id_prefix = self._get_id_prefix(base_id)

        if not base_id_prefix:
            log_warn(
                "Could not determine ID prefix from base ID.", data={"base_id": base_id}
            )
            return []

        manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        relevant_manifests = [
            m
            for m in manifests
            if m
            and any(
                r.name == "stream"
                and item_type in (r.types or [])
                and (not r.id_prefixes or base_id_prefix in r.id_prefixes)
                for r in m.resources
            )
        ]

        if not relevant_manifests:
            log_warn(
                "No relevant streaming addons found for this item.",
                data={"item_type": item_type, "base_id": base_id},
            )
            return []

        stream_tasks = [
            self._fetch_streams_for_manifest(m, item_type, base_id)
            for m in relevant_manifests
        ]
        results = await asyncio.gather(*stream_tasks)

        all_streams = [stream for sublist in results for stream in sublist]

        log_info(
            f"Aggregated {len(all_streams)} streams from {len(relevant_manifests)} addons."
        )
        return all_streams
