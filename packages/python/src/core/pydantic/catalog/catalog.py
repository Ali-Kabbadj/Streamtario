from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from core.pydantic.api.error import ErrorResponse


class CatalogItem(BaseModel):
    """
    Represents a single item in a media catalog.
    This is an enriched version of the Stremio Meta Preview Object.
    """

    id: str
    type: str
    name: Optional[str] = None
    poster: Optional[str] = None
    background: Optional[str] = None
    logo: Optional[str] = None
    description: Optional[str] = None
    release_info: Optional[str] = Field(None, alias="releaseInfo")
    imdb_id: Optional[str] = Field(None, alias="imdb_id")
    imdbRating: Optional[str] = None
    genres: Optional[List[str]] = None

    class Config:
        populate_by_name = True
        extra = "ignore"


class CatalogResponse(BaseModel):
    """
    Represents a full page of catalog content from an external addon.
    The alias ensures we can correctly parse the common `metas` field.
    """

    items: List[CatalogItem] = Field(..., alias="metas")


class DiscoveredCatalog(BaseModel):
    """A UI-friendly representation of a single browsable catalog."""

    addon_name: str = Field(..., alias="addonName")
    manifest_id: str = Field(..., alias="manifestId")
    catalog_id: str = Field(..., alias="catalogId")
    catalog_name: str = Field(..., alias="catalogName")
    catalog_type: str = Field(..., alias="catalogType")
    supported_item_types: List[str] = Field([], alias="supportedItemTypes")
    extra_props: List[dict] = Field([], alias="extraProps")

    class Config:
        populate_by_name = True
        extra = "ignore"


class CatalogRequest(BaseModel):
    """Defines the internal request to fetch a catalog from an addon."""

    manifest_url: str = Field(..., alias="manifestUrl")
    catalog_type: str = Field(..., alias="catalogType")
    catalog_id: str = Field(..., alias="catalogId")
    extra_props: Dict[str, Any] = Field({}, alias="extraProps")


class AddonSearchResult(BaseModel):
    """Holds the results from a single addon, categorized by media type."""

    addon_name: str = Field(..., alias="addonName")
    results_by_type: Dict[str, List[CatalogItem]] = Field(
        default_factory=dict, alias="resultsByType"
    )
    error: Optional[ErrorResponse] = None

    class Config:
        populate_by_name = True
