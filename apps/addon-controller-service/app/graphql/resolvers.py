from typing import List, Optional, Dict, Any
from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.aggregate_catalog import AggregateCatalogUseCase
from app.use_cases.find_and_get_meta import FindAndGetMetaUseCase
from app.use_cases.get_home_catalogs import GetHomeCatalogsUseCase
from app.use_cases.get_meta import GetMetaUseCase
from app.use_cases.get_streams import GetStreamsUseCase
from app.use_cases.get_manifest import GetManifestUseCase
from app.use_cases.get_subtitles import GetSubtitlesUseCase
from .types import (
    CatalogResult,
    PlaybackHistoryType,
    ProfileExtension,
    CatalogItemType,
    MetaItemType,
    SubtitleType,
    VideoType,
    DiscoveredCatalogType,
    DiscoveredCatalogExtraProp,
    HomeAddonSectionType,
    HomeContentRowType,
    StreamType,
    AddonManifestType,
    TrailerType,
    TrailerStreamType,
    LinkType,
    BehaviorHintType,
    CastType,
    AppExtrasType,
    SubtitleType,
)
import strawberry
from core.utils.logging import log_info, log_error
from strawberry.scalars import JSON
from .types import PlaybackHistoryType, MetaItemType
from app.use_cases.find_and_get_meta import FindAndGetMetaUseCase


@inject
async def resolve_manifest_by_url(
    url: str, use_case: GetManifestUseCase = Provide[Container.get_manifest_use_case]
) -> Optional[AddonManifestType]:
    try:
        pydantic_manifest = await use_case.execute(url)
        return AddonManifestType.from_pydantic(pydantic_manifest)
    except Exception as e:
        log_error(f"Failed to resolve manifest by URL: {url}", data={"error": str(e)})
        return None


@inject
async def resolve_discoverable_catalogs(
    profile: ProfileExtension,
    use_case: DiscoverCatalogsUseCase = Provide[Container.discover_catalogs_use_case],
) -> List[DiscoveredCatalogType]:
    pydantic_catalogs = await use_case.execute(profile_id=str(profile.id))
    strawberry_catalogs = []
    for p_cat in pydantic_catalogs:
        extra_props = [
            DiscoveredCatalogExtraProp(
                name=prop["name"],
                is_required=prop.get("isRequired", False),
                options=prop.get("options"),
                options_limit=prop.get("optionsLimit"),
            )
            for prop in p_cat.extra_props
        ]
        strawberry_catalogs.append(
            DiscoveredCatalogType(
                addon_name=p_cat.addon_name,
                manifest_id=p_cat.manifest_id,
                catalog_id=p_cat.catalog_id,
                catalog_name=p_cat.catalog_name,
                catalog_type=p_cat.catalog_type,
                supported_item_types=p_cat.supported_item_types,
                extra_props=extra_props,
            )
        )
    return strawberry_catalogs


@inject
async def resolve_profile_catalog(
    profile: ProfileExtension,
    itemType: str,
    catalogId: Optional[str],
    manifestId: Optional[str],
    extraProps: Optional[Dict[str, Any]],
    filterByType: Optional[str],
    use_case: AggregateCatalogUseCase = Provide[Container.aggregate_catalog_use_case],
) -> CatalogResult:
    pydantic_items = await use_case.execute(
        profile_id=str(profile.id),
        item_type=itemType,
        catalog_id=catalogId,
        manifest_id_filter=manifestId,
        extra_props=extraProps if extraProps else {},
        filter_by_type=filterByType,
    )
    strawberry_items = [CatalogItemType.from_pydantic(item) for item in pydantic_items]
    return CatalogResult(items=strawberry_items)


@inject
async def resolve_profile_meta(
    profile: ProfileExtension,
    itemType: str,
    itemId: str,
    use_case: FindAndGetMetaUseCase = Provide[Container.find_and_get_meta_use_case],
) -> Optional[MetaItemType]:
    pydantic_meta = await use_case.execute(
        profile_id=str(profile.id),
        item_type=itemType,
        item_id=itemId,
    )
    if not pydantic_meta:
        return None

    return MetaItemType(
        id=strawberry.ID(pydantic_meta.id),
        type=pydantic_meta.type,
        name=pydantic_meta.name,
        slug=pydantic_meta.slug,
        imdb_id=pydantic_meta.imdb_id,
        imdbRating=pydantic_meta.imdbRating,
        genres=pydantic_meta.genres,
        released=pydantic_meta.released,
        country=pydantic_meta.country,
        director=pydantic_meta.director,
        writer=pydantic_meta.writer,
        year=pydantic_meta.year,
        poster=pydantic_meta.poster,
        background=pydantic_meta.background,
        logo=pydantic_meta.logo,
        description=pydantic_meta.description,
        runtime=pydantic_meta.runtime,
        release_info=pydantic_meta.release_info,
        videos=(
            [
                VideoType(id=strawberry.ID(v.id), **v.model_dump(exclude={"id"}))
                for v in pydantic_meta.videos
            ]
            if pydantic_meta.videos
            else []
        ),
        trailers=(
            [TrailerType(**t.model_dump()) for t in pydantic_meta.trailers]
            if pydantic_meta.trailers
            else []
        ),
        trailerStreams=(
            [
                TrailerStreamType(**ts.model_dump())
                for ts in pydantic_meta.trailerStreams
            ]
            if pydantic_meta.trailerStreams
            else []
        ),
        links=(
            [LinkType(**l.model_dump()) for l in pydantic_meta.links]
            if pydantic_meta.links
            else []
        ),
        behaviorHints=(
            BehaviorHintType(**pydantic_meta.behaviorHints.model_dump())
            if pydantic_meta.behaviorHints
            else None
        ),
        app_extras=(
            AppExtrasType(
                cast=[CastType(**c.model_dump()) for c in pydantic_meta.app_extras.cast]
            )
            if pydantic_meta.app_extras and pydantic_meta.app_extras.cast
            else None
        ),
    )


@inject
async def resolve_home_catalogs(
    profile: ProfileExtension,
    use_case: GetHomeCatalogsUseCase = Provide[Container.get_home_catalogs_use_case],
) -> List[HomeAddonSectionType]:
    pydantic_sections = await use_case.execute(profile_id=str(profile.id))
    strawberry_sections = []
    for section in pydantic_sections:
        strawberry_rows = []
        for row in section.content:
            strawberry_items = [
                CatalogItemType.from_pydantic(item) for item in row.items
            ]
            strawberry_rows.append(
                HomeContentRowType(title=row.title, items=strawberry_items)
            )
        strawberry_sections.append(
            HomeAddonSectionType(addon_name=section.addon_name, content=strawberry_rows)
        )
    return strawberry_sections


@inject
async def resolve_streams(
    profile: ProfileExtension,
    itemType: str,
    itemId: str,
    use_case: GetStreamsUseCase = Provide[Container.get_streams_use_case],
) -> List[StreamType]:
    pydantic_streams = await use_case.execute(
        profile_id=str(profile.id),
        item_type=itemType,
        item_id=itemId,
    )
    return [StreamType.from_pydantic(s) for s in pydantic_streams]


@inject
async def resolve_meta_for_playback_history(
    root: PlaybackHistoryType,
    use_case: FindAndGetMetaUseCase = Provide[Container.find_and_get_meta_use_case],
) -> Optional[MetaItemType]:

    item_id_for_lookup = root.content_id
    if root.item_type == "series":
        parts = root.content_id.split(":")
        if len(parts) > 2 and parts[-1].isdigit() and parts[-2].isdigit():
            item_id_for_lookup = ":".join(parts[:-2])

    pydantic_meta = await use_case.execute(
        profile_id=str(root.profile_id),
        item_type=root.item_type,
        item_id=item_id_for_lookup,
    )

    if not pydantic_meta:
        return None

    return MetaItemType.from_pydantic(pydantic_meta)


@inject
async def resolve_subtitles(
    profile: ProfileExtension,
    itemType: str,
    contentId: str,
    filename: str,
    videoSize: str,
    videoHash: str,
    use_case: GetSubtitlesUseCase = Provide[Container.get_subtitles_use_case],
) -> List[SubtitleType]:
    pydantic_subs = await use_case.execute(
        profile_id=str(profile.id),
        item_type=itemType,
        content_id=contentId,
        filename=filename,
        video_size=videoSize,
        video_hash=videoHash,
    )
    return [
        SubtitleType(id=s.id, lang=s.lang, type=s.type, url=s.url)
        for s in pydantic_subs
    ]
