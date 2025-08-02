from typing import List, Optional, Dict, Any
from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.aggregate_catalog import AggregateCatalogUseCase
from app.use_cases.find_and_get_meta import FindAndGetMetaUseCase
from app.use_cases.get_home_catalogs import GetHomeCatalogsUseCase
from app.use_cases.get_streams import GetStreamsUseCase
from app.use_cases.get_manifest import GetManifestUseCase
from .types import (
    CatalogResult,
    ProfileExtension,
    CatalogItemType,
    MetaItemType,
    VideoType,
    DiscoveredCatalogType,
    DiscoveredCatalogExtraProp,
    HomeAddonSectionType,
    HomeContentRowType,
    StreamType,
    AddonManifestType,
)
import strawberry
from core.utils.logging import log_info, log_error
from app.use_cases.search_use_case import SearchUseCase
from strawberry.scalars import JSON


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
        genres=pydantic_meta.genres,
        poster=pydantic_meta.poster,
        background=pydantic_meta.background,
        logo=pydantic_meta.logo,
        description=pydantic_meta.description,
        release_info=pydantic_meta.release_info,
        imdb_id=pydantic_meta.imdb_id,
        videos=(
            [
                VideoType(id=strawberry.ID(v.id), **v.model_dump(exclude={"id"}))
                for v in pydantic_meta.videos
            ]
            if pydantic_meta.videos
            else []
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
