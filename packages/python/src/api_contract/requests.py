from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Dict, Any, Optional


class ApiBaseRequest(BaseModel):
    # A shared config for all request models
    class Config(ConfigDict):
        alias_generator = to_camel
        populate_by_name = True


class CatalogRequest(ApiBaseRequest):
    manifest_url: str
    catalog_type: str
    catalog_id: str
    extra_props: Dict[str, Any] = Field(default_factory=dict)


class MetaRequest(ApiBaseRequest):
    manifest_url: str
    item_type: Optional[str] = None
