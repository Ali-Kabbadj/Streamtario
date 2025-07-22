from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class Video(BaseModel):
    id: str
    title: str
    published_at: Optional[str] = Field(None, alias="publishedAt")
    released: Optional[str] = None
    thumbnail: Optional[str] = None
    stream_id: Optional[str] = Field(None, alias="streamId")

    @field_validator("published_at", mode="before")
    def set_published_at_from_released(cls, v, values):
        if v is None and "released" in values.data:
            return values.data.get("released")
        return v

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
