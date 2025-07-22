from pydantic import BaseModel, Field, model_validator, ConfigDict
from typing import List, Optional, Any


class BehaviorHints(BaseModel):
    configurable: bool = False
    configuration_required: bool = Field(False, alias="configurationRequired")
    model_config = ConfigDict(populate_by_name=True)


class ExtraOption(BaseModel):
    name: str
    is_required: bool = Field(False, alias="isRequired")
    options: Optional[List[str]] = None
    options_limit: Optional[int] = Field(None, alias="optionsLimit")
    model_config = ConfigDict(populate_by_name=True)


class Catalog(BaseModel):
    id: str
    type: str
    name: str
    extra: Optional[List[ExtraOption]] = None
    genres: Optional[List[str]] = None
    page_size: Optional[int] = Field(None, alias="pageSize")
    model_config = ConfigDict(populate_by_name=True)


class Resource(BaseModel):
    name: str
    types: Optional[List[str]] = None
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")


class AddonManifest(BaseModel):
    id: str
    version: str
    name: str
    description: str
    resources: List[Any]  # Start with a generic list
    types: List[str]
    logo: Optional[str] = None
    background: Optional[str] = None
    catalogs: List[Catalog] = []
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")
    behavior_hints: Optional[BehaviorHints] = Field(None, alias="behaviorHints")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def process_resources_after_validation(self) -> "AddonManifest":
        processed_resources = []
        for res in self.resources:
            if isinstance(res, str):
                processed_resources.append(Resource(name=res))
            elif isinstance(res, dict):
                resource_data = {
                    "name": res.get("name"),
                    "types": res.get("types"),
                    "id_prefixes": res.get(
                        "idPrefixes"
                    ),  # Manually get from the camelCase key
                }
                processed_resources.append(Resource(**resource_data))
            elif isinstance(res, Resource):
                processed_resources.append(res)

        self.resources = processed_resources
        return self
