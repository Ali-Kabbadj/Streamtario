import uuid
from typing import List, Optional
from core.pydantic.domain.addon import InstalledAddon
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class PlaybackHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content_id: str = Field(..., alias="contentId")
    position_seconds: int = Field(..., alias="positionSeconds")
    duration_seconds: int = Field(..., alias="durationSeconds")
    watched_at: datetime = Field(..., alias="watchedAt")
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = "Default"
    avatar: Optional[str] = (
        "https://i.pinimg.com/736x/5b/50/e7/5b50e75d07c726d36f397f6359098f58.jpg"
    )
    is_private: bool = Field(False, alias="isPrivate")
    pin_hash: Optional[str] = Field(None, alias="pinHash")
    installed_addons: List[InstalledAddon] = Field(
        default_factory=list, alias="installedAddons"
    )
    playback_history: List[PlaybackHistory] = Field(
        default_factory=list, alias="playbackHistory"
    )
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @property
    def manifest_urls(self) -> List[str]:
        return [addon.manifest_url for addon in self.installed_addons]
