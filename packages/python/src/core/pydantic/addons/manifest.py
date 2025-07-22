from typing import List, Optional, Union
from pydantic import BaseModel, Field, model_validator


class ExtraOption(BaseModel):
    name: str
    is_required: bool = Field(False, alias="isRequired")
    options: Optional[List[str]] = None
    options_limit: Optional[int] = Field(None, alias="optionsLimit")


class Catalog(BaseModel):
    id: str
    type: str
    name: str
    extra: Optional[List[ExtraOption]] = None


class Resource(BaseModel):
    name: str
    types: Optional[List[str]] = None
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")


class AddonManifest(BaseModel):
    id: str
    version: str
    name: str
    description: str
    resources: List[Resource]
    types: List[str]

    logo: Optional[str] = None
    background: Optional[str] = None
    catalogs: List[Catalog] = []
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")

    class Config:
        populate_by_name = True

    @model_validator(mode="before")
    @classmethod
    def pre_process_resources(cls, values):
        """
        This validator runs before the main validation and transforms
        any string resource into a Resource object.
        """
        if "resources" in values and isinstance(values["resources"], list):
            processed_resources = []
            for res in values["resources"]:
                if isinstance(res, str):
                    processed_resources.append({"name": res})
                else:
                    processed_resources.append(res)
            values["resources"] = processed_resources
        return values
