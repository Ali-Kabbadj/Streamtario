from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class StreamFile(BaseModel):
    name: str
    path: str
    length: int


class Stream(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    yt_id: Optional[str] = Field(None, alias="ytId")
    info_hash: Optional[str] = Field(None, alias="infoHash")
    file_idx: Optional[int] = Field(None, alias="fileIdx")
    behavior_hints: Optional[Dict[str, Any]] = Field(None, alias="behaviorHints")
    addon_name: Optional[str] = None
    sources: Optional[List[str]] = None
    files: Optional[List[StreamFile]] = None

    class Config:
        populate_by_name = True


class StreamResponse(BaseModel):
    streams: List[Stream]
