from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class StreamFile(BaseModel):
    path: str
    name: str
    length: int


class Stream(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    yt_id: Optional[str] = Field(None, alias="ytId")
    info_hash: Optional[str] = Field(None, alias="infoHash")
    file_idx: Optional[int] = Field(None, alias="fileIdx")
    behavior_hints: Optional[Dict[str, Any]] = Field(None, alias="behaviorHints")
    addon_name: Optional[str] = Field(None, alias="addonName")
    sources: Optional[List[str]] = None
    video_hash: Optional[str] = Field(None, alias="videoHash")

    @property
    def announce(self) -> List[str]:
        if not self.sources:
            return []
        return [
            source.split("tracker:", 1)[1]
            for source in self.sources
            if source.startswith("tracker:")
        ]

    class Config:
        populate_by_name = True
        extra = "ignore"
        computed_fields = ["announce"]


class StreamResponse(BaseModel):
    streams: List[Stream] = []
