from pydantic import BaseModel, Field, ConfigDict
from typing import List


class MpvCommand(BaseModel):
    name: str = Field(description="A user-friendly name for the command.")
    command: str = Field(description="The raw MPV command string to be executed.")
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class AudioSettings(BaseModel):
    preferred_channel_layout: str = Field(
        default="5.1",
        alias="preferredChannelLayout",
        description="Preferred audio channel layout (e.g., '2.0', '5.1', '7.1').",
    )
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class MpvSettings(BaseModel):
    custom_commands: List[MpvCommand] = Field(
        default_factory=list,
        alias="customCommands",
        description="A list of custom commands for the MPV player.",
    )
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class ProfileSettings(BaseModel):
    cache_size_gb: int = Field(
        default=10,
        alias="cacheSizeGb",
        description="Maximum size of the streaming cache on disk in Gigabytes. -1 for unlimited.",
    )
    preferred_audio_language: str = Field(
        default="eng",
        alias="preferredAudioLanguage",
        description="Preferred audio language code (ISO 639-2).",
    )
    preferred_subtitle_language: str = Field(
        default="eng",
        alias="preferredSubtitleLanguage",
        description="Preferred subtitle language code (ISO 639-2).",
    )
    stream_without_cache: bool = Field(
        default=False,
        alias="streamWithoutCache",
        description="If true, torrents will be streamed entirely in memory, ignoring cache settings.",
    )
    audio: AudioSettings = Field(
        default_factory=AudioSettings,
        description="Settings related to audio playback.",
    )
    mpv: MpvSettings = Field(
        default_factory=MpvSettings,
        description="Advanced settings for the MPV player.",
    )

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
