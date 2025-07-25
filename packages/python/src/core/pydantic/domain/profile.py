import uuid
from typing import List, Optional
from core.pydantic.domain.addon import InstalledAddon
from pydantic import BaseModel, Field, ConfigDict


class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    avatar: Optional[str] = None
    installed_addons: List[InstalledAddon] = Field(
        default_factory=list, alias="installedAddons"
    )
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @property
    def manifest_urls(self) -> List[str]:
        return [addon.manifest_url for addon in self.installed_addons]
