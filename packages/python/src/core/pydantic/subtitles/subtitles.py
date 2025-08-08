from pydantic import BaseModel, Field
from typing import List, Optional


class SubtitleFile(BaseModel):
    id: str = Field(..., description="A unique identifier for the subtitle file.")
    lang: str = Field(..., description="An ISO 639-2 (3-letter) language code.")
    type: Optional[str] = Field(
        None, description="Describes the source, either 'Embedded' or the addon name."
    )
    url: str = Field(
        ..., description="The direct URL to the subtitle file (.srt, .vtt, etc.)."
    )


class SubtitleResponse(BaseModel):
    subtitles: List[SubtitleFile] = []
