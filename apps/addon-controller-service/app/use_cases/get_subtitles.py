import asyncio
from typing import List
from urllib.parse import quote
from app.domain.providers.i_external_addon_provider import IExternalAddonProvider
from core.pydantic.subtitles.subtitles import SubtitleResponse, SubtitleFile
from core.utils.logging import log_info
from .get_manifest import GetManifestUseCase
from ..domain.providers.i_profile_addon_manifest_provider import (
    IProfileAddonManifestProvider,
)


class GetSubtitlesUseCase:
    def __init__(
        self,
        get_manifest_use_case: GetManifestUseCase,
        addon_provider: IExternalAddonProvider,
        profile_addon_manifest_provider: IProfileAddonManifestProvider,
    ):
        self.get_manifest_use_case = get_manifest_use_case
        self.addon_provider = addon_provider
        self.profile_addon_manifest_provider = profile_addon_manifest_provider

    def _get_id_for_path(self, item_type: str, content_id: str) -> str:
        media_id = content_id.split(":", 1)[-1]
        if item_type != "series":
            return media_id
        parts = media_id.split(":")
        if len(parts) > 2 and parts[-1].isdigit() and parts[-2].isdigit():
            return ":".join(parts[:-1])
        return media_id

    async def execute(
        self,
        profile_id: str,
        item_type: str,
        content_id: str,
        filename: str,
        video_size: str,
        video_hash: str,
    ) -> List[SubtitleFile]:

        manifest_urls = await self.profile_addon_manifest_provider.get_manifest_urls(
            profile_id
        )
        if not manifest_urls:
            return []

        all_manifests = await asyncio.gather(
            *[self.get_manifest_use_case.execute(url) for url in manifest_urls]
        )

        tasks_with_context = []
        id_for_path = self._get_id_for_path(item_type, content_id)
        encoded_id_for_path = quote(id_for_path)
        media_id_prefix = content_id.split(":")[1] if ":" in content_id else None

        for manifest in all_manifests:
            if not manifest or not manifest.manifest_url:
                continue

            if (
                any(r.name == "subtitles" for r in manifest.resources)
                and item_type in manifest.types
            ):
                supported_prefixes = manifest.id_prefixes or []
                if not any(
                    media_id_prefix and media_id_prefix.startswith(p)
                    for p in supported_prefixes
                ):
                    continue

                base_url = manifest.manifest_url.rsplit("/", 1)[0]

                # THE FINAL FIX: Include videoHash in the URL
                sub_url = (
                    f"{base_url}/subtitles/{item_type}/{encoded_id_for_path}"
                    f"/filename={quote(filename)}&videoSize={video_size}&videoHash={video_hash}.json"
                )

                log_info(
                    f"Queueing subtitle fetch from: {sub_url}",
                    data={"addon": manifest.name},
                )
                task = self.addon_provider.get(sub_url, response_model=SubtitleResponse)
                tasks_with_context.append((asyncio.create_task(task), manifest.name))

        if not tasks_with_context:
            return []

        task_results = await asyncio.gather(*[t[0] for t in tasks_with_context])

        all_subtitles: List[SubtitleFile] = []
        for i, response in enumerate(task_results):
            if response and response.subtitles:
                addon_name = tasks_with_context[i][1]
                for sub in response.subtitles:
                    sub.type = addon_name
                    all_subtitles.append(sub)

        log_info(f"Aggregated {len(all_subtitles)} external subtitles.")
        return all_subtitles
