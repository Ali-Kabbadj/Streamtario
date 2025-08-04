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

    # THE FIX: Parse the correct 'sources' field from the addon response.
    sources: Optional[List[str]] = None
    files: Optional[List[StreamFile]] = None

    @property
    def announce(self) -> List[str]:
        # This computed property provides the clean list of trackers for the daemon.
        if not self.sources:
            return []
        # This correctly handles both "tracker:udp://..." and "dht:..." by filtering.
        return [
            source.split("tracker:", 1)[1]
            for source in self.sources
            if source.startswith("tracker:")
        ]

    class Config:
        populate_by_name = True
        extra = "ignore"
        # Make the computed property available during model serialization
        computed_fields = ["announce"]


class StreamResponse(BaseModel):
    streams: List[Stream] = []
