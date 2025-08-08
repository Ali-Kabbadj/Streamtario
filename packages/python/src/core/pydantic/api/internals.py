from typing import List
from pydantic import BaseModel
from ..domain.profile import PlaybackHistory


class ManifestUrlsResponse(BaseModel):
    manifest_urls: List[str]


class PlaybackHistoryResponse(BaseModel):
    items: List[PlaybackHistory]
