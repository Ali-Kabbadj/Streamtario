import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class InstalledAddon(BaseModel):
    manifest_url: str = Field(..., alias="manifestUrl")
    manifest_id: str = Field(..., alias="manifestId")
    installed_at: str = Field(..., alias="installedAt")


class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    avatar: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str

    # --- THE FIX ---
    # The Python attribute name will now be camelCase, just like the JSON alias.
    # This removes all ambiguity when constructing the model.
    hashedPassword: str

    profiles: List[Profile] = Field(default_factory=list)
    installedAddons: List[InstalledAddon] = Field(default_factory=list)

    # We still need from_attributes to read from ORM models in GET requests
    # and we need populate_by_name to read the 'hashed_password' from the ORM
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
