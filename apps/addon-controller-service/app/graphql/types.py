import strawberry
from typing import List, Optional


# These types are correct as is.
@strawberry.type
class CatalogItemType:
    id: strawberry.ID
    type: str
    name: str
    poster: Optional[str] = None


@strawberry.type
class VideoType:
    id: strawberry.ID
    title: str
    released: Optional[str] = None
    thumbnail: Optional[str] = None


@strawberry.type
class MetaItemType:
    id: strawberry.ID
    type: str
    name: str
    genres: Optional[List[str]] = None
    poster: Optional[str] = None
    background: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    release_info: Optional[str] = None
    imdb_rating: Optional[str] = None
    videos: Optional[List[VideoType]] = None


@strawberry.type
class CatalogResult:
    items: List[CatalogItemType]


@strawberry.type
class MetaResult:
    meta: Optional[MetaItemType]


# This extension type is correct as is.
@strawberry.federation.type(extend=True)
class ProfileExtension:
    id: strawberry.ID = strawberry.federation.field(external=True)
    manifest_urls: List[str] = strawberry.federation.field(external=True)

    @strawberry.field
    async def catalog(self, itemType: str, catalogName: str) -> "CatalogResult":
        from .resolvers import resolve_profile_catalog

        return await resolve_profile_catalog(self, itemType, catalogName)

    @strawberry.field
    async def meta(self, itemType: str, itemId: str) -> "MetaResult":
        from .resolvers import resolve_profile_meta

        return await resolve_profile_meta(self, itemType, itemId)
