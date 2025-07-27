from typing import List
from pydantic import BaseModel


class ManifestUrlsResponse(BaseModel):
    manifest_urls: List[str]
