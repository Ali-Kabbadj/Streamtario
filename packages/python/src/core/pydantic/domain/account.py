import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from .profile import Profile


class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashed_password: Optional[str] = Field(None, validation_alias="hashed_password")
    google_id: Optional[str] = Field(None, validation_alias="google_id")
    facebook_id: Optional[str] = Field(None, validation_alias="facebook_id")
    profiles: List[Profile] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
