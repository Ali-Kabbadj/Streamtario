from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List, Optional, Any, Union


class BehaviorHints(BaseModel):
    configurable: bool = False
    configuration_required: bool = Field(False, alias="configurationRequired")
    new_episode_notifications: Optional[bool] = Field(
        None, alias="newEpisodeNotifications"
    )
    searchable: Optional[bool] = None
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class ExtraOption(BaseModel):
    name: str
    is_required: bool = Field(False, alias="isRequired")
    options: Optional[List[str]] = None
    options_limit: Optional[int] = Field(None, alias="optionsLimit")
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class Catalog(BaseModel):
    id: str
    type: str
    name: str
    extra: Optional[List[ExtraOption]] = None
    genres: Optional[List[str]] = None
    page_size: Optional[int] = Field(None, alias="pageSize")
    extra_supported: Optional[List[str]] = Field(None, alias="extraSupported")
    extra_required: Optional[List[str]] = Field(None, alias="extraRequired")
    is_search: Optional[bool] = Field(default=False, validation_alias="isSearch")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class Resource(BaseModel):
    name: str
    types: Optional[List[str]] = None
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class AddonCatalog(BaseModel):
    type: str
    id: str
    name: str
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class AddonManifest(BaseModel):
    id: str
    version: str
    name: str
    description: str
    resources: List[Resource]
    types: List[str]
    logo: Optional[str] = None
    manifest_url: Optional[str] = None
    background: Optional[str] = None
    catalogs: List[Catalog] = []
    id_prefixes: Optional[List[str]] = Field(None, alias="idPrefixes")
    behavior_hints: Optional[BehaviorHints] = Field(None, alias="behaviorHints")
    addon_catalogs: Optional[List[AddonCatalog]] = Field(None, alias="addonCatalogs")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    @field_validator("resources", mode="before")
    @classmethod
    def normalize_resources(cls, v: List[Any]) -> List[Resource]:
        processed_resources = []
        if not isinstance(v, list):
            return []
        for res in v:
            if isinstance(res, str):
                processed_resources.append(Resource(name=res))
            elif isinstance(res, dict):
                resource_data = {
                    "name": res.get("name"),
                    "types": res.get("types"),
                    "id_prefixes": res.get("idPrefixes") or res.get("id_prefixes"),
                }
                processed_resources.append(Resource(**resource_data))
        return processed_resources
