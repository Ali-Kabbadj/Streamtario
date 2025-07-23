import uuid
from typing import List
from pydantic import BaseModel, Field, ConfigDict
from .profile import Profile


class Account(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    hashed_password: str = Field(validation_alias="hashed_password")
    profiles: List[Profile] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
