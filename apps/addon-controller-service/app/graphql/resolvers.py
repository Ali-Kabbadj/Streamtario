from typing import List, Optional, Dict, Any, AsyncGenerator
from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.aggregate_catalog import AggregateCatalogUseCase
from app.use_cases.find_and_get_meta import FindAndGetMetaUseCase
from .types import (
    AddonSearchResultType,
    CatalogResult,
    ProfileExtension,
    CatalogItemType,
    MetaItemType,
    VideoType,
    DiscoveredCatalogType,
    DiscoveredCatalogExtraProp,
)
import strawberry
from core.utils.logging import log_info
from app.use_cases.search_use_case import SearchUseCase
from strawberry.scalars import JSON


@inject
async def resolve_discoverable_catalogs(
    profile: ProfileExtension,
    use_case: DiscoverCatalogsUseCase = Provide[Container.discover_catalogs_use_case],
) -> List[DiscoveredCatalogType]:
    log_info(
        f"GraphQL: Resolving federated field 'discoverable_catalogs' for profile {profile.id}",
        context="graphql",
        data={"manifest_urls": profile.manifest_urls},
    )
    pydantic_catalogs = await use_case.execute(manifest_urls=profile.manifest_urls)

    strawberry_catalogs = []
    for p_cat in pydantic_catalogs:
        extra_props = [
            DiscoveredCatalogExtraProp(
                name=prop["name"],
                is_required=prop.get(
                    "isRequired", False
                ),  # Map camelCase to snake_case
                options=prop.get("options"),
                options_limit=prop.get("optionsLimit"),
            )
            for prop in p_cat.extra_props
        ]
        # --- END FIX ---

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
    manifestId: Optional[str],  # <-- NEW ARGUMENT
    extraProps: Optional[Dict[str, Any]],
    filterByType: Optional[str],
    use_case: AggregateCatalogUseCase = Provide[Container.aggregate_catalog_use_case],
) -> CatalogResult:
    log_info(
        f"GraphQL: Resolving federated field 'catalog' for profile {profile.id}",
        context="graphql",
        data={
            "item_type": itemType,
            "catalog_id": catalogId,
            "manifest_id_filter": manifestId,
            "extra_props": extraProps,
            "filter_by_type": filterByType,
        },
    )
    pydantic_items = await use_case.execute(
        manifest_urls=profile.manifest_urls,
        item_type=itemType,
        catalog_id=catalogId,
        manifest_id_filter=manifestId,
        extra_props=extraProps if extraProps else {},
        filter_by_type=filterByType,
    )
    strawberry_items = [
        CatalogItemType(
            id=strawberry.ID(item.id),
            type=item.type,
            name=item.name,
            poster=item.poster,
        )
        for item in pydantic_items
    ]
    return CatalogResult(items=strawberry_items)


@inject
async def resolve_profile_meta(
    profile: ProfileExtension,
    itemType: str,
    itemId: str,
    use_case: FindAndGetMetaUseCase = Provide[Container.find_and_get_meta_use_case],
) -> Optional[MetaItemType]:
    log_info(
        f"GraphQL: Resolving federated field 'meta' for profile {profile.id}",
        context="graphql",
        data={"item_type": itemType, "item_id": itemId},
    )
    pydantic_meta = await use_case.execute(
        manifest_urls=profile.manifest_urls,
        item_type=itemType,
        item_id=itemId,
    )
    if not pydantic_meta:
        return None

    # Map from Pydantic model to Strawberry type
    strawberry_meta = MetaItemType(
        id=strawberry.ID(pydantic_meta.id),
        type=pydantic_meta.type,
        name=pydantic_meta.name,
        genres=pydantic_meta.genres,
        poster=pydantic_meta.poster,
        background=pydantic_meta.background,
        logo=pydantic_meta.logo,
        description=pydantic_meta.description,
        release_info=pydantic_meta.release_info,
        imdb_rating=pydantic_meta.imdb_rating,
        videos=(
            [
                VideoType(id=strawberry.ID(v.id), **v.model_dump(exclude={"id"}))
                for v in pydantic_meta.videos
            ]
            if pydantic_meta.videos
            else []
        ),
    )
    return strawberry_meta
