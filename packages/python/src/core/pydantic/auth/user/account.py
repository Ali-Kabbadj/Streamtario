import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


class InstalledAddon(BaseModel):
    """Represents an add-on that has been installed by a user."""

    manifest_url: str = Field(..., alias="manifestUrl")
    manifest_id: str = Field(..., alias="manifestId")
    installed_at: str = Field(..., alias="installedAt")


class Profile(BaseModel):
    """A user profile with its own configuration and state."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    avatar: Optional[str] = None


class Account(BaseModel):
    """The main user account model."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashed_password: str = Field(..., alias="hashedPassword")
    profiles: List[Profile] = []
    installed_addons: List[InstalledAddon] = Field([], alias="installedAddons")
