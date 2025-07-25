from pydantic import BaseModel, Field
from typing import List, Optional


class Video(BaseModel):
    id: str
    title: str
    released: Optional[str] = None
    thumbnail: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "ignore"


class MetaItem(BaseModel):
    id: str
    type: str
    name: str
    genres: Optional[List[str]] = None
    poster: Optional[str] = None
    background: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    release_info: Optional[str] = Field(None, alias="releaseInfo")
    imdb_rating: Optional[str] = Field(None, alias="imdbRating")
    videos: Optional[List[Video]] = None

    class Config:
        populate_by_name = True
        extra = "ignore"


class MetaResponse(BaseModel):
    """The standard wrapper for a meta item response from an addon."""

    meta: MetaItem
