from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict


class CatalogItem(BaseModel):
    """Represents a single item in a media catalog (e.g., a movie poster)."""

    id: str
    type: str
    name: str
    poster: Optional[str] = None

    class Config:
        populate_by_name = True
        # "allow" for all data but each item will have a huge amount of data
        extra = "ignore"


class CatalogResponse(BaseModel):
    """Represents a full page of catalog content from an addon."""

    items: List[CatalogItem] = Field(..., alias="metas")


class CatalogRequest(BaseModel):
    """Defines the internal request to fetch a catalog from an addon."""

    manifest_url: str = Field(..., alias="manifestUrl")
    catalog_type: str = Field(..., alias="catalogType")
    catalog_id: str = Field(..., alias="catalogId")
    extra_props: Dict[str, Any] = Field({}, alias="extraProps")


class DiscoveredCatalog(BaseModel):
    """A UI-friendly representation of a single browsable catalog."""

    addon_name: str = Field(..., alias="addonName")
    manifest_id: str = Field(..., alias="manifestId")

    catalog_id: str = Field(..., alias="catalogId")
    catalog_name: str = Field(..., alias="catalogName")
    catalog_type: str = Field(..., alias="catalogType")

    extra_props: List[dict] = Field([], alias="extraProps")

    class Config:
        populate_by_name = True


class AddonSearchResult(BaseModel):
    """Holds the results from a single addon, categorized by media type."""

    addon_name: str = Field(..., alias="addonName")
    results_by_type: Dict[str, List[CatalogItem]] = Field(..., alias="resultsByType")

    class Config:
        populate_by_name = True
