from pydantic import BaseModel, Field
from typing import List, Optional


class Video(BaseModel):
    id: str
    title: Optional[str] = Field(None, alias="name")
    released: Optional[str] = None
    thumbnail: Optional[str] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    logo: Optional[str] = None  # Added missing logo field

    class Config:
        populate_by_name = True
        extra = "ignore"


class Trailer(BaseModel):
    source: Optional[str] = None
    type: Optional[str] = None

    class Config:
        extra = "ignore"


class TrailerStream(BaseModel):
    title: Optional[str] = None
    ytId: Optional[str] = None

    class Config:
        extra = "ignore"


class Link(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    url: Optional[str] = None

    class Config:
        extra = "ignore"


class BehaviorHint(BaseModel):
    defaultVideoId: Optional[str] = None
    hasScheduledVideos: bool = False

    class Config:
        extra = "ignore"


class Cast(BaseModel):
    name: Optional[str] = None
    character: Optional[str] = None
    photo: Optional[str] = None

    class Config:
        extra = "ignore"


class AppExtras(BaseModel):
    cast: Optional[List[Cast]] = None

    class Config:
        extra = "ignore"


class MetaItem(BaseModel):
    # Existing fields
    id: str
    type: str
    name: str
    genres: Optional[List[str]] = None
    poster: Optional[str] = None
    background: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    release_info: Optional[str] = Field(None, alias="releaseInfo")
    imdb_id: Optional[str] = Field(None, alias="imdb_id")
    videos: Optional[List[Video]] = None

    # Added fields
    country: Optional[str] = None
    director: Optional[List[str]] = None
    imdbRating: Optional[str] = None
    slug: Optional[str] = None
    writer: Optional[List[str]] = None
    year: Optional[str] = None
    runtime: Optional[str] = None
    released: Optional[str] = None
    trailers: Optional[List[Trailer]] = None
    trailerStreams: Optional[List[TrailerStream]] = None
    links: Optional[List[Link]] = None
    behaviorHints: Optional[BehaviorHint] = None
    app_extras: Optional[AppExtras] = Field(None, alias="app_extras")

    class Config:
        populate_by_name = True
        extra = "ignore"


class MetaResponse(BaseModel):
    """The standard wrapper for a meta item response from an addon."""

    meta: MetaItem
