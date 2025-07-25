from dependency_injector.wiring import inject, Provide
from app.containers import Container
from app.use_cases.aggregate_all_addons import AggregateAllAddonsUseCase

# Import the actual Strawberry types we will be constructing.
from .types import (
    CatalogResult,
    MetaResult,
    ProfileExtension,
    CatalogItemType,
    MetaItemType,
    VideoType,
)
import strawberry


@inject
async def resolve_profile_catalog(
    profile: ProfileExtension,
    item_type: str,
    catalog_name: str,
    use_case: AggregateAllAddonsUseCase = Provide[
        Container.aggregate_all_addons_use_case
    ],
) -> CatalogResult:
    pydantic_items = await use_case.get_catalogs(
        manifest_urls=profile.manifest_urls,
        item_type=item_type,
        catalog_name=catalog_name,
        extra_props={},
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
    use_case: AggregateAllAddonsUseCase = Provide[
        Container.aggregate_all_addons_use_case
    ],
) -> MetaResult:
    pydantic_meta = await use_case.get_meta(
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
