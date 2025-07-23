import uuid
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class InstalledAddon(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    manifest_url: str = Field(..., alias="manifestUrl")
    manifest_id: str = Field(..., alias="manifestId")
    installed_at: datetime = Field(..., alias="installedAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
