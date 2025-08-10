from xmlrpc.client import boolean
import strawberry
from typing import List, Optional
from strawberry.scalars import JSON
from core.pydantic.catalog.catalog import CatalogItem
from core.pydantic.stream.stream import Stream
from core.pydantic.addons.manifest import AddonManifest
from core.pydantic.meta.meta import MetaItem as PydanticMetaItem
from strawberry.federation.schema_directives import Requires


@strawberry.type
class SubtitleType:
    id: str
    type: Optional[str]
    lang: str
    url: str


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
    imdb_id: Optional[str] = None  # <-- ADDED
    description: Optional[str] = None  # <-- ADDED
    release_info: Optional[str] = None  # <-- ADDED
    genres: Optional[List[str]] = None  # <-- ADDED
    imdbRating: Optional[str] = None  # <-- ADDED

    @classmethod
    def from_pydantic(cls, model: CatalogItem) -> "CatalogItemType":
        return cls(
            id=strawberry.ID(model.id),
            type=model.type,
            name=model.name or f"Untitled {model.type}",
            poster=model.poster,
            imdb_id=model.imdb_id,  # <-- ADDED
            description=model.description,  # <-- ADDED
            release_info=model.release_info,  # <-- ADDED
            genres=model.genres,  # <-- ADDED
            imdbRating=model.imdbRating,  # <-- ADDED
        )


@strawberry.type
class VideoType:
    id: strawberry.ID
    title: Optional[str]
    released: Optional[str] = None
    thumbnail: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    logo: Optional[str] = None


@strawberry.type
class TrailerType:
    source: Optional[str] = None
    type: Optional[str] = None


@strawberry.type
class TrailerStreamType:
    title: Optional[str] = None
    ytId: Optional[str] = None


@strawberry.type
class LinkType:
    name: Optional[str] = None
    category: Optional[str] = None
    url: Optional[str] = None


@strawberry.type
class BehaviorHintType:
    defaultVideoId: Optional[str] = None
    hasScheduledVideos: bool


@strawberry.type
class CastType:
    name: Optional[str] = None
    character: Optional[str] = None
    photo: Optional[str] = None


@strawberry.type
class AppExtrasType:
    cast: Optional[List[CastType]] = None


@strawberry.type
class MetaItemType:
    imdb_id: str
    country: Optional[str]
    description: Optional[str] = None
    director: Optional[List[str]] = None
    genres: Optional[List[str]] = None
    imdbRating: Optional[str]
    name: str
    released: Optional[str] = None
    slug: Optional[str] = None
    type: str
    writer: Optional[List[str]] = None
    year: Optional[str] = None
    trailers: Optional[List[TrailerType]] = None
    background: Optional[str] = None
    poster: Optional[str] = None
    runtime: Optional[str] = None
    id: strawberry.ID
    release_info: Optional[str] = None
    trailerStreams: Optional[List[TrailerStreamType]] = None
    links: Optional[List[LinkType]] = None
    behaviorHints: Optional[BehaviorHintType] = None
    logo: Optional[str] = None
    app_extras: Optional[AppExtrasType] = None
    videos: Optional[List[VideoType]] = None

    @classmethod
    def from_pydantic(cls, model: PydanticMetaItem) -> "MetaItemType":
        return cls(
            id=strawberry.ID(model.id),
            type=model.type,
            name=model.name,
            slug=model.slug,
            imdb_id=model.imdb_id,
            imdbRating=model.imdbRating,
            genres=model.genres,
            country=model.country,
            director=model.director,
            writer=model.writer,
            year=model.year,
            poster=model.poster,
            background=model.background,
            logo=model.logo,
            description=model.description,
            runtime=model.runtime,
            release_info=model.release_info,
            videos=(
                [
                    VideoType(id=strawberry.ID(v.id), **v.model_dump(exclude={"id"}))
                    for v in model.videos
                ]
                if model.videos
                else []
            ),
            trailers=(
                [TrailerType(**t.model_dump()) for t in model.trailers]
                if model.trailers
                else []
            ),
            trailerStreams=(
                [TrailerStreamType(**ts.model_dump()) for ts in model.trailerStreams]
                if model.trailerStreams
                else []
            ),
            links=(
                [LinkType(**l.model_dump()) for l in model.links] if model.links else []
            ),
            behaviorHints=(
                BehaviorHintType(**model.behaviorHints.model_dump())
                if model.behaviorHints
                else None
            ),
            app_extras=(
                AppExtrasType(
                    cast=[CastType(**c.model_dump()) for c in model.app_extras.cast]
                )
                if model.app_extras and model.app_extras.cast
                else None
            ),
        )


from strawberry.types import Info
from strawberry.federation.schema_directives import Requires


@strawberry.federation.type(extend=True, keys=["id"])
class PlaybackHistoryType:
    id: strawberry.ID = strawberry.federation.field(external=True)

    profile_id: strawberry.ID = strawberry.federation.field(
        external=True, name="profileId"
    )
    content_id: str = strawberry.federation.field(external=True)
    item_type: str = strawberry.federation.field(external=True)

    @strawberry.field(directives=[Requires(fields="profileId contentId itemType")])
    async def meta(self) -> Optional["MetaItemType"]:
        from .resolvers import resolve_meta_for_playback_history

        return await resolve_meta_for_playback_history(self)


@strawberry.type
class AddonManifestType:
    id: str
    version: str
    name: str
    description: str
    logo: Optional[str] = None
    types: List[str]

    @classmethod
    def from_pydantic(cls, model: AddonManifest) -> "AddonManifestType":
        return cls(
            id=model.id,
            version=model.version,
            name=model.name,
            description=model.description,
            logo=model.logo,
            types=model.types,
        )


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
class StreamFileType:
    name: str
    path: str
    length: int


@strawberry.type
class HomeAddonSectionType:
    addon_name: str
    content: List[HomeContentRowType]


@strawberry.type
class StreamType:
    name: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    yt_id: Optional[str] = None
    info_hash: Optional[str] = None
    file_idx: Optional[int] = None
    behavior_hints: Optional[JSON] = None  # type: ignore
    addon_name: Optional[str] = None
    announce: Optional[List[str]] = None
    files: Optional[List["StreamFileType"]] = None

    @classmethod
    def from_pydantic(cls, model: Stream) -> "StreamType":
        return cls(
            name=model.name,
            title=model.title,
            url=model.url,
            yt_id=model.yt_id,
            info_hash=model.info_hash,
            file_idx=model.file_idx,
            behavior_hints=model.behavior_hints,
            addon_name=model.addon_name,
            announce=model.announce,
        )


@strawberry.federation.type(name="Profile", keys=["id"], extend=True)
class ProfileExtension:
    id: strawberry.ID = strawberry.federation.field(external=True)

    @strawberry.field
    async def discoverable_catalogs(self) -> List["DiscoveredCatalogType"]:
        from .resolvers import resolve_discoverable_catalogs

        return await resolve_discoverable_catalogs(self)

    @strawberry.field
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

    @strawberry.field
    async def meta(self, itemType: str, itemId: str) -> Optional["MetaItemType"]:
        from .resolvers import resolve_profile_meta

        return await resolve_profile_meta(self, itemType, itemId)

    @strawberry.field
    async def home_catalogs(self) -> List["HomeAddonSectionType"]:
        from .resolvers import resolve_home_catalogs

        return await resolve_home_catalogs(self)

    @strawberry.field
    async def streams(self, itemType: str, itemId: str) -> List["StreamType"]:
        from .resolvers import resolve_streams

        return await resolve_streams(self, itemType, itemId)

    @strawberry.field
    async def subtitles(
        self,
        itemType: str,
        contentId: str,
        filename: str,
        videoSize: str,
        videoHash: str,
    ) -> List["SubtitleType"]:
        from .resolvers import resolve_subtitles

        return await resolve_subtitles(
            self, itemType, contentId, filename, videoSize, videoHash
        )
