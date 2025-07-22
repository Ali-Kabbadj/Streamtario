import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class InstalledAddon(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    manifest_url: str = Field(..., alias="manifestUrl")
    manifest_id: str = Field(..., alias="manifestId")
    installed_at: datetime = Field(..., alias="installedAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    avatar: Optional[str] = None
    installed_addons: List[InstalledAddon] = Field(
        default_factory=list, alias="installedAddons"
    )
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashedPassword: str = Field(validation_alias="hashed_password")
    profiles: List[Profile] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
