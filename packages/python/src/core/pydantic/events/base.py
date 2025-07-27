import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, List


# The base for all events in our system, ensuring consistency.
class BaseEvent(BaseModel):

    model_config = ConfigDict(
        json_encoders={
            # Teach Pydantic how to convert datetime to a string
            datetime: lambda v: v.isoformat(),
        }
    )

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_version: str = "1.0"


# --- ACCOUNT EVENTS ---


class AccountCreatedEvent(BaseEvent):
    event_name: Literal["account.created"] = "account.created"
    account_id: str
    email: str
    provider: Literal["password", "google", "facebook"]


# --- PROFILE EVENTS ---


class ProfileCreatedEvent(BaseEvent):
    event_name: Literal["profile.created"] = "profile.created"
    account_id: str
    profile_id: str
    name: str


class ProfileUpdatedEvent(BaseEvent):
    event_name: Literal["profile.updated"] = "profile.updated"
    # account_id: str
    profile_id: str
    updated_fields: List[str]  # e.g., ["name", "avatar"]


class ProfileDeletedEvent(BaseEvent):
    event_name: Literal["profile.deleted"] = "profile.deleted"
    account_id: str
    profile_id: str


# --- ADDON EVENTS ---


class AddonInstalledEvent(BaseEvent):
    event_name: Literal["addon.installed"] = "addon.installed"
    account_id: str
    profile_id: str
    manifest_url: str
    manifest_id: str


class AddonUninstalledEvent(BaseEvent):
    event_name: Literal["addon.uninstalled"] = "addon.uninstalled"
    account_id: str
    profile_id: str
    manifest_id: str
    manifest_url: str
