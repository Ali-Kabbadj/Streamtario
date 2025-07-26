from typing import List, Optional
from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.discover_catalogs import DiscoverCatalogsUseCase
from app.use_cases.aggregate_catalog import AggregateCatalogUseCase
from app.use_cases.find_and_get_meta import FindAndGetMetaUseCase
from .types import (
    CatalogResult,
    MetaResult,
    ProfileExtension,
    CatalogItemType,
    MetaItemType,
    VideoType,
    DiscoveredCatalogType,
    DiscoveredCatalogExtraProp,
)
import strawberry
from core.utils.logging import log_info


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
    item_type: str,
    catalog_id: str,  # CHANGED from catalog_name
    filter_by_type: Optional[str],
    use_case: AggregateCatalogUseCase = Provide[Container.aggregate_catalog_use_case],
) -> CatalogResult:
    log_info(
        f"GraphQL: Resolving federated field 'catalog' for profile {profile.id}",
        context="graphql",
        data={
            "item_type": item_type,
            "catalog_id": catalog_id,  # CHANGED
            "manifest_urls": profile.manifest_urls,
            "filter_by_type": filter_by_type,
        },
    )
    pydantic_items = await use_case.execute(
        manifest_urls=profile.manifest_urls,
        item_type=item_type,
        catalog_id=catalog_id,  # CHANGED
        extra_props={},
        filter_by_type=filter_by_type,
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
    item_type: str,
    item_id: str,
    use_case: FindAndGetMetaUseCase = Provide[Container.find_and_get_meta_use_case],
) -> MetaResult:
    log_info(
        f"GraphQL: Resolving federated field 'meta' for profile {profile.id}",
        context="graphql",
        data={
            "item_type": item_type,
            "item_id": item_id,
            "manifest_urls": profile.manifest_urls,
        },
    )
    pydantic_meta = await use_case.execute(
        manifest_urls=profile.manifest_urls,
        item_type=item_type,
        item_id=item_id,
    )
    if not pydantic_meta:
        return MetaResult(meta=None)

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
                VideoType(
                    id=strawberry.ID(v.id),
                    title=v.title,
                    released=v.released,
                    thumbnail=v.thumbnail,
                )
                for v in pydantic_meta.videos
            ]
            if pydantic_meta.videos
            else []
        ),
    )
    return MetaResult(meta=strawberry_meta)
