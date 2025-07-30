import strawberry
from typing import List, Optional, AsyncGenerator
from strawberry.federation.schema_directives import Requires
from strawberry.scalars import JSON
from core.pydantic.catalog.catalog import CatalogItem


@strawberry.type
class DiscoveredCatalogExtraProp:
    name: str
    is_required: bool
    options: Optional[List[str]] = None
    options_limit: Optional[int] = None


@strawberry.type
class DiscoveredCatalogType:
    addon_name: str
    manifest_id: str
    catalog_id: str
    catalog_name: str
    catalog_type: str
    supported_item_types: List[str]
    extra_props: List[DiscoveredCatalogExtraProp]


@strawberry.type
class CatalogItemType:
    id: strawberry.ID
    type: str
    name: str
    poster: Optional[str] = None

    @classmethod
    def from_pydantic(cls, model: CatalogItem) -> "CatalogItemType":
        return cls(
            id=strawberry.ID(model.id),
            type=model.type,
            name=model.name,
            poster=model.poster,
        )


@strawberry.type
class VideoType:
    id: strawberry.ID
    title: Optional[str]
    released: Optional[str] = None
    thumbnail: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None


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
class AddonSearchResultType:
    addon_name: str
    results_by_type: JSON  # type: ignore
    error: Optional[str] = None


@strawberry.type
class HomeContentRowType:
    title: str
    items: List[CatalogItemType]


@strawberry.type
class HomeAddonSectionType:
    addon_name: str
    content: List[HomeContentRowType]


@strawberry.federation.type(name="Profile", keys=["id"], extend=True)
class ProfileExtension:
    id: strawberry.ID = strawberry.federation.field(external=True)
    manifest_urls: List[str] = strawberry.federation.field(external=True)

    @strawberry.federation.field(directives=[Requires(fields="manifestUrls")])
    async def discoverable_catalogs(self) -> List["DiscoveredCatalogType"]:
        from .resolvers import resolve_discoverable_catalogs

        return await resolve_discoverable_catalogs(self)

    @strawberry.federation.field(directives=[Requires(fields="manifestUrls")])
    async def catalog(
        self,
        itemType: str,
        catalogId: Optional[str] = None,
        manifestId: Optional[str] = None,
        extraProps: Optional[JSON] = None,  # type: ignore
        filterByType: Optional[str] = None,
    ) -> "CatalogResult":
        from .resolvers import resolve_profile_catalog

        return await resolve_profile_catalog(
            self, itemType, catalogId, manifestId, extraProps, filterByType
        )

    @strawberry.federation.field(directives=[Requires(fields="manifestUrls")])
    async def meta(self, itemType: str, itemId: str) -> Optional["MetaItemType"]:
        from .resolvers import resolve_profile_meta

        return await resolve_profile_meta(self, itemType, itemId)

    @strawberry.federation.field(directives=[Requires(fields="manifestUrls")])
    async def home_catalogs(self) -> List["HomeAddonSectionType"]:
        from .resolvers import resolve_home_catalogs

        return await resolve_home_catalogs(self)
