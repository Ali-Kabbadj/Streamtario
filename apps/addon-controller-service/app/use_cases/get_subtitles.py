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
        video_id = content_id.split(":", 1)[-1]
        encoded_video_id = quote(video_id)
        media_id_prefix = video_id.split(":")[0] if ":" in video_id else video_id

        for manifest in all_manifests:
            if not manifest or not manifest.manifest_url:
                continue

            if (
                any(r.name == "subtitles" for r in manifest.resources)
                and item_type in manifest.types
            ):
                id_prefixes = next(
                    (
                        r.id_prefixes
                        for r in manifest.resources
                        if r.name == "subtitles"
                    ),
                    manifest.id_prefixes,
                )
                if id_prefixes and not any(
                    media_id_prefix and media_id_prefix.startswith(p)
                    for p in id_prefixes
                ):
                    continue

                base_url = manifest.manifest_url.rsplit("/", 1)[0]

                extra_args_str = f"videoHash={video_hash}&videoSize={video_size}&filename={quote(filename, safe='')}"

                sub_url = f"{base_url}/subtitles/{item_type}/{encoded_video_id}/{extra_args_str}.json"

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
