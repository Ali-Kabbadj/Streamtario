import strawberry
from typing import List, Optional
from strawberry.federation.schema_directives import Requires


# These types are correct and do not need to change.
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


#
# THIS IS THE CORRECTED CLASS DEFINITION
#
@strawberry.federation.type(name="Profile", keys=["id"], extend=True)
class ProfileExtension:
    """
    This class extends the "Profile" type defined in the account-profile-service.
    """

    # We identify the Profile to extend by its `id` key.
    id: strawberry.ID = strawberry.federation.field(external=True)

    # We declare that we need the `manifest_urls` field from the base Profile.
    # We DO NOT use an alias here. Strawberry will correctly understand that this
    # Python attribute corresponds to the 'manifestUrls' field in the GraphQL schema.
    manifest_urls: List[str] = strawberry.federation.field(external=True)

    # In the `@requires` directive, we use the GraphQL schema name (`manifestUrls`),
    # which Strawberry automatically creates from the `manifest_urls` python attribute.
    @strawberry.federation.field(directives=[Requires(fields="manifestUrls")])
    async def catalog(self, itemType: str, catalogName: str) -> "CatalogResult":
        from .resolvers import resolve_profile_catalog

        return await resolve_profile_catalog(self, itemType, catalogName)

    @strawberry.federation.field(directives=[Requires(fields="manifestUrls")])
    async def meta(self, itemType: str, itemId: str) -> "MetaResult":
        from .resolvers import resolve_profile_meta

        return await resolve_profile_meta(self, itemType, itemId)
