from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class Stream(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    url: Optional[str] = None
    yt_id: Optional[str] = Field(None, alias="ytId")
    info_hash: Optional[str] = Field(None, alias="infoHash")
    file_idx: Optional[int] = Field(None, alias="fileIdx")
    behavior_hints: Optional[Dict[str, Any]] = Field(None, alias="behaviorHints")

    class Config:
        populate_by_name = True
        extra = "ignore"


class StreamResponse(BaseModel):
    streams: List[Stream] = []
