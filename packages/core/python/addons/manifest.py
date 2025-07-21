from typing import List, Optional, Union
from pydantic import BaseModel, Field


# Base models for Catalog 'extra' options
class ExtraOption(BaseModel):
    name: str
    is_required: bool = Field(False, alias="isRequired")
    options: Optional[List[str]] = None
    options_limit: Optional[int] = Field(None, alias="optionsLimit")


# Base model for Catalog definitions
class Catalog(BaseModel):
    id: str
    type: str
    name: str
    extra: Optional[List[ExtraOption]] = None


# Base model for Resource definitions
class Resource(BaseModel):
    name: str
    types: List[str]
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")


# The main AddonManifest model
class AddonManifest(BaseModel):
    id: str
    version: str
    name: str
    description: str
    resources: List[Union[str, Resource]]
    types: List[str]

    logo: Optional[str] = None
    background: Optional[str] = None
    catalogs: List[Catalog] = []
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")

    class Config:
        populate_by_name = True  # Allows using alias like 'isRequired'
