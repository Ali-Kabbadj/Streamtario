from pydantic import BaseModel, Field
from typing import Dict, Any


class CatalogRequestModel(BaseModel):
    manifest_url: str = Field(..., alias="manifestUrl")
    catalog_type: str = Field(..., alias="catalogType")
    catalog_id: str = Field(..., alias="catalogId")
    extra_props: Dict[str, Any] = Field({}, alias="extraProps")


class MetaRequestModel(BaseModel):
    manifest_url: str = Field(..., alias="manifestUrl")
    item_type: str | None = Field(None, alias="itemType")
