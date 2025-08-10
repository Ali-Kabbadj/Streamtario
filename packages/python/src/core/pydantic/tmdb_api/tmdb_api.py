from pydantic import BaseModel, Field
from typing import List, Optional


class TMDBSearchResult(BaseModel):
    id: int
    name: str
    popularity: float
    profile_path: Optional[str] = Field(None, alias="profile_path")


class TMDBSearchResponse(BaseModel):
    results: List[TMDBSearchResult]


class TMDBPersonDetails(BaseModel):
    id: int
    name: str
    imdb_id: Optional[str] = Field(None, alias="imdb_id")
    biography: Optional[str] = None
    birthday: Optional[str] = None
    deathday: Optional[str] = None
    place_of_birth: Optional[str] = Field(None, alias="place_of_birth")
    profile_path: Optional[str] = Field(None, alias="profile_path")
    known_for_department: Optional[str] = Field(None, alias="known_for_department")


class TMDBCreditItem(BaseModel):
    id: int
    media_type: str = Field(..., alias="media_type")
    # For movies
    title: Optional[str] = None
    release_date: Optional[str] = Field(None, alias="release_date")
    # For TV shows
    name: Optional[str] = None
    first_air_date: Optional[str] = Field(None, alias="first_air_date")
    # Common
    character: Optional[str] = None
    job: Optional[str] = None


class TMDBCreditsResponse(BaseModel):
    cast: List[TMDBCreditItem] = Field(default_factory=list)
    crew: List[TMDBCreditItem] = Field(default_factory=list)
