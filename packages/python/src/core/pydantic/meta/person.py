from pydantic import BaseModel, Field
from typing import List, Optional


class FilmographyItem(BaseModel):
    title: str
    year: Optional[str] = None
    role: str
    type: str  


class ExternalLink(BaseModel):
    site: str
    url: Optional[str] = None


class PersonDetails(BaseModel):
    name: str
    birth_name: Optional[str] = Field(None, alias="birthName")
    summary: Optional[str] = None 
    biography: Optional[str] = None
    birth_date: Optional[str] = Field(None, alias="birthDate")
    birth_place: Optional[str] = Field(None, alias="birthPlace")
    death_date: Optional[str] = Field(None, alias="deathDate")
    death_location: Optional[str] = Field(None, alias="deathLocation")
    image_url: Optional[str] = Field(None, alias="imageUrl")
    professions: List[str] = Field(default_factory=list)
    filmography: List[FilmographyItem] = Field(default_factory=list)
    external_links: List[ExternalLink] = Field(
        default_factory=list, alias="externalLinks"
    )

    class Config:
        populate_by_name = True
